import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell, LabelList,
  PieChart, Pie, Sector, AreaChart, Area, Legend, ReferenceLine
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, PieChart as PieIcon, Users, Activity } from 'lucide-react';
import { getActiveMFHolders, getPassiveMFHolders } from '../services/api';
import { useEffect, useState } from 'react';
import { cn , formatName} from "./ui/utils";
import { getCategoryColor } from '../constants/colors';

interface TopMutualFundsProps {
  topN: number;
  metricView: string;
  mfView: string;
  dateRange: string;
  buId?: number;
}

export function TopMutualFunds({ topN, metricView, mfView, dateRange, buId }: TopMutualFundsProps) {
  const [activeData, setActiveData] = useState<any[]>([]);
  const [passiveData, setPassiveData] = useState<any[]>([]);
  const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '' });
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const [passiveHoverIndex, setPassiveHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = dimensions.width < 768;
  const isTablet = dimensions.width < 1024;
  const isUltraWide = dimensions.width >= 1920;
  const isLargeTopN = topN >= 15;

  const pieSizeScale = dimensions.height >= 1200 ? 1.4 : dimensions.height >= 1000 ? 1.2 : 1;

  const pieRadii = isUltraWide
    ? { inner: 60, outer: 100, containerH: "h-[260px] 2xl:h-[320px]" }
    : isMobile
      ? { inner: 35, outer: 55, containerH: "h-[160px]" }
      : { inner: 50, outer: 85, containerH: "h-[220px] 2xl:h-[260px]" }; // Tightened further for universal fit

  useEffect(() => {
    async function fetchData() {
      try {
        const [activeRaw, passiveRaw] = await Promise.all([
          getActiveMFHolders(buId, dateRange),
          getPassiveMFHolders(buId, dateRange)
        ]);

        const sample = activeRaw[0] || passiveRaw[0];
        const drString = sample?.["DateRange"] || "";
        if (drString.includes(' vs ')) {
          const parts = drString.split(' vs ');
          setDetectedDates({ latest: parts[1], prev: parts[0] });
        } else {
          setDetectedDates({ latest: "Latest", prev: "Previous" });
        }

        const aggregateMF = (rawData: any[], nameKey: string, dates: any) => {
          const aggregated: Record<string, any> = {};
          rawData.forEach((item: any) => {
            const name = (item[nameKey] || item["Institution"] || item["Name of Holder"] || "").trim();
            if (!name || name === "Unknown") return;

            const curH = parseFloat(String(item["Current"] || 0).replace(/,/g, '')) || 0;
            const preH = parseFloat(String(item["Previous"] || 0).replace(/,/g, '')) || 0;
            const pCur = parseFloat(item["% of Sh. Cap (Current)"] || item["Latest Percent"]) || 0;
            const pPrev = parseFloat(item["% of Sh. Cap (Previous)"] || item["Previous Percent"]) || 0;
            const buyVal = parseFloat(item["Buy"]) || 0;
            const sellVal = parseFloat(item["Sell"]) || 0;

            if (!aggregated[name]) {
              aggregated[name] = {
                name,
                holdings: curH,
                prevHoldings: preH,
                percent: pCur,
                prevPercent: pPrev,
                change: curH - preH,
                buy: buyVal,
                sell: sellVal,
              };
            } else {
              aggregated[name].holdings = Math.max(aggregated[name].holdings, curH);
              aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings, preH);
              aggregated[name].percent = Math.max(aggregated[name].percent, pCur);
              aggregated[name].prevPercent = Math.max(aggregated[name].prevPercent, pPrev);
              aggregated[name].change = aggregated[name].holdings - aggregated[name].prevHoldings;
              aggregated[name].buy = Math.max(aggregated[name].buy, buyVal);
              aggregated[name].sell = Math.max(aggregated[name].sell, sellVal);
            }
          });
          return Object.values(aggregated);
        };

        setActiveData(aggregateMF(activeRaw, "Institution", {}));
        setPassiveData(aggregateMF(passiveRaw, "Name of Holder", {}));
      } catch (e) { console.error("MF fetch failed:", e); }
    }
    fetchData();
  }, [dateRange, buId]);

  const totalActive = activeData.reduce((a, c) => a + c.holdings, 0);
  const totalPassive = passiveData.reduce((a, c) => a + c.holdings, 0);
  const totalHoldings = totalActive + totalPassive;
  const totalPrevHoldings = activeData.reduce((a, c) => a + (c.prevHoldings || 0), 0) + passiveData.reduce((a, c) => a + (c.prevHoldings || 0), 0);
  const globalWoWChange = totalHoldings - totalPrevHoldings;

  const activeChartData = activeData.sort((a, b) => b.holdings - a.holdings).slice(0, topN);
  const passiveChartData = passiveData.sort((a, b) => b.holdings - a.holdings).slice(0, topN);

  const activePalette = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#451a03'];
  const passivePalette = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#022c22'];


  return (
    <div className="space-y-4 transition-all duration-300">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 inline-block">Top Mutual Funds</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest leading-relaxed px-0.5">Comparing {detectedDates.latest} vs {detectedDates.prev}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-amber-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total MF holdings</div>
            <div className="text-base 2xl:text-lg font-black text-amber-500">
              {totalHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-amber-600 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none uppercase">Active MF holdings</div>
            <div className="text-base 2xl:text-lg font-black text-amber-600">
              {totalActive.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-emerald-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none uppercase">Passive MF holdings</div>
            <div className="text-base 2xl:text-lg font-black text-emerald-500">
              {totalPassive.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center gap-1 shrink-0 min-h-[85px] h-full">
            <div className="flex justify-between items-center text-[9px] 2xl:text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
              <span>Active share</span>
              <span className="text-primary dark:text-sky-400 font-black">{((totalActive / totalHoldings) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-[9px] 2xl:text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
              <span>Passive share</span>
              <span className="text-primary dark:text-sky-400 font-black">{((totalPassive / totalHoldings) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/50 text-[9px] 2xl:text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
              <span>Change</span>
              <span className={cn("font-black", globalWoWChange >= 0 ? "text-primary dark:text-sky-400" : "text-rose-600 dark:text-rose-400")}>
                {Math.abs(globalWoWChange).toLocaleString()}L
              </span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-3 bg-card shadow-xl border-border">
        <div className="w-full mb-6 px-2">
          <h3 className="text-sm 2xl:text-base font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest uppercase border-l-4 border-primary dark:border-sky-500 pl-3">MUTUAL FUND INVESTMENT DISTRIBUTION</h3>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-6 w-full">
          <div className={cn("relative w-full flex flex-col items-center", isLargeTopN ? "h-auto" : pieRadii.containerH)}>
            <div className="absolute top-0 w-full flex justify-center z-10 pointer-events-none py-1 text-center">
              <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest">Top Active MF Investors</h3>
            </div>
            <div className={cn("w-full shrink-0", pieRadii.containerH)}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={pieRadii.inner}
                    outerRadius={pieRadii.outer}
                    paddingAngle={3}
                    dataKey="holdings"
                    nameKey="name"
                    stroke="none"
                  >
                    {activeChartData.map((_entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={activePalette[index % activePalette.length]} 
                        onMouseEnter={() => setActiveHoverIndex(index)}
                        onMouseLeave={() => setActiveHoverIndex(null)}
                        style={{ cursor: 'pointer', outline: 'none', filter: activeHoverIndex === index ? 'brightness(1.1) drop-shadow(0 0 5px rgba(0,0,0,0.2))' : 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: string) => [`${v.toLocaleString()} Lakhs`, name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {isLargeTopN && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 w-full px-2">
                {activeChartData.map((item, idx) => (
                  <div key={idx} 
                    className={cn(
                      "flex items-center gap-2 p-1 border-b border-border/30 text-[10px] font-bold transition-all duration-200 cursor-pointer rounded uppercase",
                      activeHoverIndex === idx ? "bg-sky-500/10 scale-[1.02] shadow-sm z-10" : "text-muted-foreground"
                    )}
                    onMouseEnter={() => setActiveHoverIndex(idx)}
                    onMouseLeave={() => setActiveHoverIndex(null)}
                  >
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-all", activeHoverIndex === idx ? "scale-125 shadow-md" : "")} style={{ backgroundColor: activePalette[idx % activePalette.length] }} />
                    <span className={cn("truncate flex-1 transition-colors", activeHoverIndex === idx ? "text-sky-700 dark:text-sky-400" : "")}>{item.name}</span>
                    <span className={cn("transition-all", activeHoverIndex === idx ? "text-sky-700 dark:text-sky-400 font-black scale-105" : "text-primary dark:text-sky-400")}>{item.holdings.toLocaleString()}L</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={cn("relative w-full flex flex-col items-center", isLargeTopN ? "h-auto" : pieRadii.containerH)}>
            <div className="absolute top-0 w-full flex justify-center z-10 pointer-events-none py-1 text-center">
              <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest">Top Passive MF Investors</h3>
            </div>
            <div className={cn("w-full shrink-0", pieRadii.containerH)}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={passiveChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={pieRadii.inner}
                    outerRadius={pieRadii.outer}
                    paddingAngle={3}
                    dataKey="holdings"
                    nameKey="name"
                    stroke="none"
                  >
                    {passiveChartData.map((_entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={passivePalette[index % passivePalette.length]} 
                        onMouseEnter={() => setPassiveHoverIndex(index)}
                        onMouseLeave={() => setPassiveHoverIndex(null)}
                        style={{ cursor: 'pointer', outline: 'none', filter: passiveHoverIndex === index ? 'brightness(1.1) drop-shadow(0 0 5px rgba(0,0,0,0.2))' : 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: string) => [`${v.toLocaleString()} Lakhs`, name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 900 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {isLargeTopN && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 w-full px-2">
                {passiveChartData.map((item, idx) => (
                  <div key={idx} 
                    className={cn(
                      "flex items-center gap-2 p-1 border-b border-border/30 text-[10px] font-bold transition-all duration-200 cursor-pointer rounded uppercase",
                      passiveHoverIndex === idx ? "bg-sky-500/10 scale-[1.02] shadow-sm z-10" : "text-muted-foreground"
                    )}
                    onMouseEnter={() => setPassiveHoverIndex(idx)}
                    onMouseLeave={() => setPassiveHoverIndex(null)}
                  >
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-all", passiveHoverIndex === idx ? "scale-125 shadow-md" : "")} style={{ backgroundColor: passivePalette[idx % passivePalette.length] }} />
                    <span className={cn("truncate flex-1 transition-colors", passiveHoverIndex === idx ? "text-sky-700 dark:text-sky-400" : "")}>{item.name}</span>
                    <span className={cn("transition-all", passiveHoverIndex === idx ? "text-sky-700 dark:text-sky-400 font-black scale-105" : "text-sky-500")}>{item.holdings.toLocaleString()}L</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 md:p-6 bg-card shadow-xl border-border">
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-12 w-full">
          <div className="space-y-4">
            <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest border-l-4 border-blue-500 pl-3">Top {topN} Active MF Investors</h3>
            <div className="border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
              <div className="w-full max-h-[500px] overflow-y-auto custom-scrollbar relative">
                <Table>
                  <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-white/10">
                      <TableHead rowSpan={2} className="w-14 text-center text-white font-bold border-r border-white/5 py-4 uppercase">Rank</TableHead>
                      <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 whitespace-normal py-4 w-[30%] uppercase">Shareholder Name</TableHead>
                      <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/10 py-2 whitespace-normal leading-tight uppercase">
                        {detectedDates.latest}
                      </TableHead>
                      <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/5 py-2 whitespace-normal leading-tight uppercase">
                        {detectedDates.prev}
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center text-white font-bold py-4 whitespace-normal leading-tight uppercase">Change in Holding Shares</TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent text-[9px] 2xl:text-[10px] border-b border-white/10 uppercase">
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal bg-sky-400/20">HOLDINGS (L)</TableHead>
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% OF SHARE CAPITAL</TableHead>
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal">HOLDINGS (L)</TableHead>
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% OF SHARE CAPITAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-card">
                      {activeChartData.map((row, idx) => (
                        <TableRow 
                          key={row.name} 
                          className={cn(
                            "hover:bg-muted/50 transition-all duration-200 border-b border-border last:border-0 group",
                            activeHoverIndex === idx && "bg-sky-500/[0.08] dark:bg-sky-400/[0.12] border-l-4 border-l-sky-500 scale-[1.005] z-10 shadow-sm"
                          )}
                          onMouseEnter={() => setActiveHoverIndex(idx)}
                          onMouseLeave={() => setActiveHoverIndex(null)}
                        >
                          <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-4 whitespace-normal">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-sky-300 border-r border-border py-4 leading-tight whitespace-normal w-[30%] uppercase">{row.name}</TableCell>

                          <TableCell className={cn(
                            "text-center font-mono font-black text-[12px] 2xl:text-[14px] border-r border-border/50 py-4 whitespace-normal transition-all",
                            activeHoverIndex === idx 
                              ? "bg-sky-500/30 text-sky-800 dark:text-sky-200 scale-[1.02] shadow-inner" 
                              : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                          )}>{row.holdings.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                          <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] text-foreground border-r border-border py-4 whitespace-normal bg-muted/5">{row.percent.toFixed(2)}%</TableCell>

                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] text-muted-foreground border-r border-border/50 py-4 whitespace-normal">{row.prevHoldings.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] text-muted-foreground border-r border-border py-4 whitespace-normal">{row.prevPercent.toFixed(2)}%</TableCell>

                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] py-4 whitespace-normal">
                          {row.buy > 0 ? (
                            <span className="text-foreground">{row.buy.toLocaleString()}</span>
                          ) : row.sell > 0 ? (
                            <span className="text-rose-600">{row.sell.toLocaleString()}</span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest border-l-4 border-emerald-500 pl-3">Top {topN} Passive MF Investors</h3>
            <div className="border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
              <div className="w-full max-h-[500px] overflow-y-auto custom-scrollbar relative">
                <Table>
                  <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-white/10">
                      <TableHead rowSpan={2} className="w-14 text-center text-white font-bold border-r border-white/5 py-4 uppercase">Rank</TableHead>
                      <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 whitespace-normal py-4 w-[30%] uppercase">Shareholder Name</TableHead>
                      <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/20 py-2 whitespace-normal leading-tight uppercase">
                        {detectedDates.latest}
                      </TableHead>
                      <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/5 py-2 whitespace-normal leading-tight uppercase">
                        {detectedDates.prev}
                      </TableHead>
                      <TableHead rowSpan={2} className="text-center text-white font-bold py-4 whitespace-normal leading-tight uppercase">Change in Holding Share</TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent text-[9px] 2xl:text-[10px] border-b border-white/10 uppercase">
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal bg-sky-400/20">HOLDINGS (L)</TableHead>
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% OF SHARE CAPITAL</TableHead>
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal">HOLDINGS (L)</TableHead>
                      <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% OF SHARE CAPITAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-card">
                    {passiveChartData.map((row, idx) => (
                      <TableRow 
                        key={row.name} 
                        className={cn(
                          "hover:bg-muted/50 transition-all duration-200 border-b border-border last:border-0 group",
                          passiveHoverIndex === idx && "bg-sky-500/[0.08] dark:bg-sky-400/[0.12] border-l-4 border-l-sky-500 scale-[1.005] z-10 shadow-sm"
                        )}
                        onMouseEnter={() => setPassiveHoverIndex(idx)}
                        onMouseLeave={() => setPassiveHoverIndex(null)}
                      >
                        <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-4 whitespace-normal">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-sky-300 border-r border-border py-4 leading-tight whitespace-normal w-[30%] uppercase">{row.name}</TableCell>

                        <TableCell className={cn(
                          "text-center font-mono font-black text-[12px] 2xl:text-[14px] border-r border-border/50 py-4 whitespace-normal transition-all",
                          passiveHoverIndex === idx 
                            ? "bg-sky-500/30 text-sky-800 dark:text-sky-200 scale-[1.02] shadow-inner" 
                            : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                        )}>{row.holdings.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] text-foreground border-r border-border py-4 whitespace-normal bg-muted/5">{row.percent.toFixed(2)}%</TableCell>

                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] text-muted-foreground border-r border-border/50 py-4 whitespace-normal">{row.prevHoldings.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] text-muted-foreground border-r border-border py-4 whitespace-normal">{row.prevPercent.toFixed(2)}%</TableCell>

                        <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] py-4 whitespace-normal">
                          {row.buy > 0 ? (
                            <span className="text-foreground">{row.buy.toLocaleString()}</span>
                          ) : row.sell > 0 ? (
                            <span className="text-rose-600">{row.sell.toLocaleString()}</span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}