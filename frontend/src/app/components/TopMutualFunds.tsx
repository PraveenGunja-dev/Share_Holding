import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell, LabelList,
  PieChart, Pie, Sector, AreaChart, Area, Legend, ReferenceLine
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, PieChart as PieIcon, Users, Activity } from 'lucide-react';
import { getActiveMFHolders, getPassiveMFHolders } from '../services/api';
import { useEffect, useState } from 'react';
import { cn, formatName } from "./ui/utils";
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
  const totalActivePrevHoldings = activeData.reduce(
    (a, c) => a + (c.prevHoldings || 0),
    0,
  );
  const totalPassivePrevHoldings = passiveData.reduce(
    (a, c) => a + (c.prevHoldings || 0),
    0,
  );
  const totalPrevHoldings = totalActivePrevHoldings + totalPassivePrevHoldings;
  const globalWoWChange = totalHoldings - totalPrevHoldings;

  const activeWoWChange = totalActive - totalActivePrevHoldings;
  const passiveWoWChange = totalPassive - totalPassivePrevHoldings;
  const activeSharePct = totalHoldings > 0 ? (totalActive / totalHoldings) * 100 : 0;
  const passiveSharePct = totalHoldings > 0 ? (totalPassive / totalHoldings) * 100 : 0;

  const isAllView = mfView === "all";
  const isActiveView = mfView === "active";
  const isPassiveView = mfView === "passive";

  const activeChartData = activeData.sort((a, b) => b.holdings - a.holdings).slice(0, topN);
  const passiveChartData = passiveData.sort((a, b) => b.holdings - a.holdings).slice(0, topN);

  const activePalette = [
    '#0088CC', '#E91E63', '#F59E0B', '#7B1FA2', '#00897B',
    '#EF5350', '#FF6D00', '#5C6BC0', '#43A047', '#C62828',
    '#0097A7', '#8D6E63', '#3949AB', '#00ACC1', '#D81B60',
    '#7CB342', '#F4511E', '#1E88E5', '#FDD835', '#6D4C41'
  ];
  const passivePalette = [
    '#00897B', '#7B1FA2', '#0088CC', '#EF5350', '#F59E0B',
    '#43A047', '#E91E63', '#5C6BC0', '#FF6D00', '#0097A7',
    '#C62828', '#3949AB', '#8D6E63', '#D81B60', '#00ACC1',
    '#F4511E', '#7CB342', '#1E88E5', '#6D4C41', '#FDD835'
  ];


  return (
    <div className="space-y-4 transition-all duration-300">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 inline-block">Top Mutual Funds</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest leading-relaxed px-0.5">Comparing {detectedDates.latest} vs {detectedDates.prev}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <Card
            className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 h-[85px]"
            style={{ borderRightColor: getCategoryColor("DII-MF") }}
          >
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">
              {isAllView ? "Total MF holdings" : isActiveView ? "Active MF holdings" : "Passive MF holdings"}
            </div>
            <div
              className={cn(
                "text-base 2xl:text-lg font-black",
                isPassiveView ? "text-primary dark:text-emerald-400" : "text-primary dark:text-sky-400",
              )}
            >
              {(isAllView ? totalHoldings : isActiveView ? totalActive : totalPassive).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>

          <Card
            className={cn(
              "p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 h-[85px]",
              isPassiveView ? "border-r-emerald-500" : "border-r-amber-600",
            )}
          >
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none uppercase">
              {isAllView ? "Active MF holdings" : isPassiveView ? "Passive MF holdings" : "Active MF holdings"}
            </div>
            <div
              className={cn(
                "text-base 2xl:text-lg font-black",
                isPassiveView ? "text-primary dark:text-emerald-400" : "text-amber-600",
              )}
            >
              {(isAllView ? totalActive : isActiveView ? totalActive : totalPassive).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>

          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-emerald-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none uppercase">
              {isAllView ? "Passive MF holdings" : isPassiveView ? "Passive entities" : "Active entities"}
            </div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-emerald-400">
              {(isAllView ? totalPassive : isPassiveView ? passiveData.length : activeData.length).toLocaleString()}
            </div>
          </Card>

          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center gap-1 shrink-0 h-[85px] border-r-4 border-r-sky-500">
            {isAllView || isActiveView ? (
              <div className="flex justify-between items-center text-[9px] 2xl:text-[10px] font-black text-foreground tracking-widest uppercase">
                <span>Active share</span>
                <span className="text-primary dark:text-sky-400 font-black">{activeSharePct.toFixed(1)}%</span>
              </div>
            ) : null}

            {isAllView || isPassiveView ? (
              <div className="flex justify-between items-center text-[9px] 2xl:text-[10px] font-black text-foreground tracking-widest uppercase">
                <span>Passive share</span>
                <span className="text-primary dark:text-sky-400 font-black">{passiveSharePct.toFixed(1)}%</span>
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-1 border-t border-border/50 text-[9px] 2xl:text-[10px] font-black text-foreground tracking-widest uppercase">
              <span>{isAllView ? "Change" : isActiveView ? "Change (Active)" : "Change (Passive)"}</span>
              <span
                className={cn(
                  "font-black",
                  (isActiveView ? activeWoWChange : isPassiveView ? passiveWoWChange : globalWoWChange) >= 0
                    ? "text-primary dark:text-sky-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {Math.abs(
                  isActiveView ? activeWoWChange : isPassiveView ? passiveWoWChange : globalWoWChange,
                ).toLocaleString()}
                L
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 1: ACTIVE MUTUAL FUNDS */}
      {(mfView === 'all' || mfView === 'active') && (
      <div className="space-y-6">
        <Card className="p-4 bg-card shadow-xl border-border">
          <div className="w-full mb-6 px-2 flex justify-between items-center">
            <h3 className="text-sm 2xl:text-base font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest uppercase border-l-4 border-blue-500 pl-3">TOP ACTIVE MF INVESTORS - DISTRIBUTION</h3>
          </div>
          <div className={cn("relative w-full flex flex-col items-center", isLargeTopN ? "h-auto" : pieRadii.containerH)}>
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
                    {activeChartData.map((_entry, index) => {
                      const isActive = activeHoverIndex === index;
                      const isHovering = activeHoverIndex !== null;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={activePalette[index % activePalette.length]}
                          onMouseEnter={() => setActiveHoverIndex(index)}
                          onMouseLeave={() => setActiveHoverIndex(null)}
                          style={{
                            cursor: "pointer",
                            outline: "none",
                            opacity: !isHovering ? 1 : isActive ? 1 : 0.18,
                            filter: isActive
                              ? "brightness(1.12) drop-shadow(0 0 6px rgba(0,0,0,0.25))"
                              : "none",
                            transition: "opacity 200ms ease, filter 200ms ease",
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: string) => [`${v.toLocaleString()} Lakhs`, formatName(name)]}
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
                    <span className={cn("truncate flex-1 transition-colors", activeHoverIndex === idx ? "text-sky-700 dark:text-sky-400" : "")}>{formatName(item.name)}</span>
                    <span className={cn("transition-all", activeHoverIndex === idx ? "text-sky-700 dark:text-sky-400 font-black scale-105" : "text-primary dark:text-sky-400")}>{item.holdings.toLocaleString()}L</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-6 bg-card shadow-xl border-border">
          <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest border-l-4 border-blue-500 pl-3 mb-4">Top {topN} Active MF Investors - Rankings</h3>
          <div className="border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="w-full max-h-[500px] overflow-auto custom-scrollbar relative">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead rowSpan={2} className="w-14 text-center text-white font-bold border-r border-white/5 py-5 text-[13px] font-['Adani']">Rank</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 py-5 w-[30%] text-[13px] font-['Adani']">Shareholder Name</TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/10 py-2 whitespace-normal leading-tight">
                      {detectedDates.latest}
                    </TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/5 py-2 whitespace-normal leading-tight">
                      {detectedDates.prev}
                    </TableHead>
                    <TableHead rowSpan={2} className="text-center text-white font-bold py-5 text-[13px] font-['Adani']">Change in Holding Shares</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal bg-sky-400/20 text-[13px] font-['Adani']">Holding</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight text-[13px] font-['Adani']">% of Share Capital</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal text-[13px] font-['Adani']">Holding</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight text-[13px] font-['Adani']">% of Share Capital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {activeChartData.map((row, idx) => (
                    <TableRow
                      key={row.name}
                      className="hover:bg-muted/50 transition-colors duration-200 border-b border-border last:border-0"
                    >
                      <TableCell className="text-center font-black text-muted-foreground text-[13px] font-['Adani'] border-r border-border py-4 whitespace-normal">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-[13px] font-['Adani'] text-primary dark:text-sky-300 border-r border-border py-4 leading-tight whitespace-normal w-[30%]">{formatName(row.name)}</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border/50 py-4 whitespace-normal transition-colors bg-sky-500/15 text-sky-700 dark:text-sky-400">
                        {row.holdings.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] text-foreground border-r border-border py-4 whitespace-normal bg-muted/5">{row.percent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border/50 py-4 whitespace-normal">{row.prevHoldings.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border py-4 whitespace-normal">{row.prevPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] py-4 whitespace-normal">
                        {row.buy > 0 ? (
                          <span className="text-foreground dark:text-white font-black">{row.buy.toLocaleString()}</span>
                        ) : row.sell > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">{row.sell.toLocaleString()}</span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
      )}

      {mfView === 'all' && <div className="h-4" />} {/* Spacer */}

      {/* SECTION 2: PASSIVE MUTUAL FUNDS */}
      {(mfView === 'all' || mfView === 'passive') && (
      <div className="space-y-6">
        <Card className="p-4 bg-card shadow-xl border-border">
          <div className="w-full mb-6 px-2">
            <h3 className="text-sm 2xl:text-base font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest uppercase border-l-4 border-emerald-500 pl-3">TOP PASSIVE MF INVESTORS - DISTRIBUTION</h3>
          </div>
          <div className={cn("relative w-full flex flex-col items-center", isLargeTopN ? "h-auto" : pieRadii.containerH)}>
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
                    {passiveChartData.map((_entry, index) => {
                      const isActive = passiveHoverIndex === index;
                      const isHovering = passiveHoverIndex !== null;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={passivePalette[index % passivePalette.length]}
                          onMouseEnter={() => setPassiveHoverIndex(index)}
                          onMouseLeave={() => setPassiveHoverIndex(null)}
                          style={{
                            cursor: "pointer",
                            outline: "none",
                            opacity: !isHovering ? 1 : isActive ? 1 : 0.18,
                            filter: isActive
                              ? "brightness(1.12) drop-shadow(0 0 6px rgba(0,0,0,0.25))"
                              : "none",
                            transition: "opacity 200ms ease, filter 200ms ease",
                          }}
                        />
                      );
                    })}
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
        </Card>

        <Card className="p-4 md:p-6 bg-card shadow-xl border-border">
          <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest border-l-4 border-emerald-500 pl-3 mb-4">Top {topN} Passive MF Investors - Rankings</h3>
          <div className="border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="w-full max-h-[500px] overflow-auto custom-scrollbar relative">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead rowSpan={2} className="w-14 text-center text-white font-bold border-r border-white/5 py-4 text-[13px] font-['Adani']">Rank</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 whitespace-normal py-4 w-[30%] text-[13px] font-['Adani']">Shareholder Name</TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/20 py-2 whitespace-normal leading-tight">
                      {detectedDates.latest}
                    </TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/5 py-2 whitespace-normal leading-tight">
                      {detectedDates.prev}
                    </TableHead>
                    <TableHead rowSpan={2} className="text-center text-white font-bold py-4 whitespace-normal leading-tight text-[13px] font-['Adani']">Change in Holding Shares</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal bg-sky-400/20 text-[13px] font-['Adani']">Holding</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight text-[13px] font-['Adani']">% of Share Capital</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal text-[13px] font-['Adani']">Holding</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight text-[13px] font-['Adani']">% of Share Capital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {passiveChartData.map((row, idx) => (
                    <TableRow
                      key={row.name}
                      className="hover:bg-muted/50 transition-colors duration-200 border-b border-border last:border-0"
                    >
                      <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-4 whitespace-normal">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-[13px] font-['Adani'] text-primary dark:text-sky-300 border-r border-border py-4 leading-tight whitespace-normal w-[30%]">{row.name}</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border/50 py-4 whitespace-normal transition-colors bg-sky-500/15 text-sky-700 dark:text-sky-400">
                        {row.holdings.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] text-foreground border-r border-border py-4 whitespace-normal bg-muted/5">{row.percent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border/50 py-4 whitespace-normal">{row.prevHoldings.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border py-4 whitespace-normal">{row.prevPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-mono font-black text-[11px] 2xl:text-[13px] py-4 whitespace-normal">
                        {row.buy > 0 ? (
                          <span className="text-foreground dark:text-white font-black">{row.buy.toLocaleString()}</span>
                        ) : row.sell > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">{row.sell.toLocaleString()}</span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
      )}
    </div>
  );
}