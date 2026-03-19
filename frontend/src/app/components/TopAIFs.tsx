import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell, LabelList,
  PieChart, Pie, Legend
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, Users, PieChart as PieIcon, ShieldCheck, Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { getAIFHolders } from '../services/api';
import { useEffect, useState } from 'react';
import { cn, formatName } from "./ui/utils";
import { getCategoryColor } from '../constants/colors';

interface TopAIFsProps {
  topN: number;
  metricView: string;
  dateRange: string;
  buId?: number;
}

export function TopAIFs({ topN, metricView, dateRange, buId }: TopAIFsProps) {
  const [liveData, setLiveData] = useState<any[]>([]);
  const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '' });
  const [activeRank, setActiveRank] = useState<number | null>(null);

  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

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

  useEffect(() => {
    async function fetchData() {
      try {
        const rawData = await getAIFHolders(buId, dateRange);
        if (!rawData || rawData.length === 0) return;

        const sample = rawData[0];
        const drString = sample["DateRange"] || "";
        if (drString.includes(' vs ')) {
          const parts = drString.split(' vs ');
          setDetectedDates({ latest: parts[1], prev: parts[0] });
        } else {
          setDetectedDates({ latest: "Latest", prev: "Previous" });
        }

        const aggregated: Record<string, any> = {};
        rawData.forEach((item: any) => {
          const name = (
            item["Institution"] ||
            item["Name of Holder"] ||
            item["Name"] ||
            item["Shareholder Name"] ||
            item["Entity"] ||
            ""
          ).trim();

          if (!name || name === "Unknown" || name.toLowerCase().includes("total")) return;

          const hCur = parseFloat(String(item["Current"] || 0).replace(/,/g, '')) || 0;
          const hPrev = parseFloat(String(item["Previous"] || 0).replace(/,/g, '')) || 0;
          const pCur = parseFloat(item["% of Sh. Cap (Current)"] || item["Latest Percent"]) || 0;
          const pPrev = parseFloat(item["% of Sh. Cap (Previous)"] || item["Previous Percent"]) || 0;

          if (!aggregated[name]) {
            aggregated[name] = {
              name,
              holdings: hCur,
              prevHoldings: hPrev,
              percent: pCur,
              prevPercent: pPrev,
            };
          } else {
            aggregated[name].holdings = Math.max(aggregated[name].holdings, hCur);
            aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings, hPrev);
            aggregated[name].percent = Math.max(aggregated[name].percent, pCur);
            aggregated[name].prevPercent = Math.max(aggregated[name].prevPercent, pPrev);
          }
        });

        const finalData = Object.values(aggregated).map((d: any) => ({
          ...d,
          change: d.holdings - d.prevHoldings
        }));

        setLiveData(finalData);
      } catch (e) { console.error("AIF fetch failed:", e); }
    }
    fetchData();
  }, [dateRange, buId]);

  const processedData = [...liveData].sort((a, b) => b.holdings - a.holdings);
  const totalAIFHoldings = processedData.reduce((acc, curr) => acc + curr.holdings, 0);
  const totalWoWChange = processedData.reduce((acc, curr) => acc + curr.change, 0);
  const activeAIFCount = processedData.filter(d => d.holdings > 0).length;

  const chartData = processedData
    .filter(d => d.holdings > 0)
    .slice(0, topN)
    .map(d => {
      let activeVal = d.holdings;
      let label = `${d.holdings.toLocaleString()}L`;

      if (metricView === 'percentage') {
        activeVal = d.percent;
        label = `${d.percent.toFixed(2)}%`;
      } else if (metricView === 'change') {
        activeVal = Math.abs(d.change);
        label = `${d.change > 0 ? '+' : ''}${d.change.toLocaleString()}L`;
      }

      return {
        name: d.name,
        value: activeVal,
        label: label
      };
    });

  const isLargeTopN = topN >= 15;
  const pieRadii = isUltraWide
    ? { inner: 90, outer: 145, containerH: dimensions.height > 1200 ? "500px" : "380px" }
    : isMobile
      ? { inner: 45, outer: 70, containerH: "240px" }
      : { inner: 75, outer: 110, containerH: "320px" };

  const aifPalette = [
    getCategoryColor('DII-AIF'),
    '#6366f1', // Indigo 500
    '#4338ca', // Indigo 700
    '#3730a3', // Indigo 800
    '#818cf8', // Indigo 400
    '#c7d2fe', // Indigo 200
  ];

  return (
    <div id="aifs" className="space-y-6 transition-all duration-300">
      {/* Header Row: Title on Left, KPIs on Right */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 inline-block">Top AIFs</h2>
          <p className="text-[11px] 2xl:text-[13px] text-muted-foreground font-bold opacity-80 tracking-widest">Comparing {detectedDates.latest} vs {detectedDates.prev}</p>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 h-[85px]"
            style={{ borderRightColor: getCategoryColor('DII-AIF') }}>
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total AIF holdings</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-indigo-400">
              {totalAIFHoldings.toLocaleString()}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-sky-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Change in holding shares</div>
            <div className={cn("text-base 2xl:text-lg font-black", totalWoWChange >= 0 ? "text-primary dark:text-sky-400" : "text-rose-600 dark:text-rose-400")}>
              {Math.abs(totalWoWChange).toLocaleString()}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-blue-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total Investors</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {activeAIFCount}
              <span className="text-[9px] font-black text-foreground ml-1">Entities</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 bg-card border-border shadow-xl overflow-hidden">
        <div className="w-full mb-6 px-2">
          <h3 className="text-sm 2xl:text-base font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest uppercase border-l-4 border-primary dark:border-sky-500 pl-3">ALTERNATIVE INVESTMENT FUNDS (AIF) ANALYSIS</h3>
        </div>
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Left Column: Chart */}
          <div className="xl:w-[28%] flex flex-col items-center justify-center border-r border-border/50 pr-0 xl:pr-8 py-4">
            <div className="w-full mb-6">
              <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-black tracking-[0.2em] opacity-80">
                Holdings by % of Share Capital
              </p>
            </div>

            <div className={cn("w-full flex items-center justify-center shrink-0")} style={{ height: pieRadii.containerH }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={pieRadii.inner}
                    outerRadius={pieRadii.outer}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={1000}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={aifPalette[index % aifPalette.length]}
                        onMouseEnter={() => setActiveRank(index)}
                        onMouseLeave={() => setActiveRank(null)}
                        className="transition-all duration-300"
                        style={{ cursor: 'pointer', outline: 'none', filter: activeRank === index ? 'brightness(1.1) drop-shadow(0 0 5px rgba(0,0,0,0.2))' : 'none' }}
                      />
                    ))}
                    {!isLargeTopN && (
                      <LabelList
                        dataKey="name"
                        position="outside"
                        offset={25}
                        style={{ fontSize: '13px', fontWeight: 500, fill: 'var(--foreground)' }}
                        formatter={(name: string) => name.toUpperCase()}
                      />
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '16px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                    itemStyle={{ color: 'var(--card-foreground)', fontSize: '13px', fontWeight: 500 }}
                    labelStyle={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}
                    formatter={(v: any, name: any) => [
                      `${v.toLocaleString()}${metricView === 'percentage' ? '%' : ' Lakhs'}`,
                      name.toUpperCase()
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {isLargeTopN && (
              <div className="mt-6 grid grid-cols-1 gap-y-2 w-full px-2">
                {chartData.map((item, idx) => (
                  <div key={idx}
                    className={cn(
                      "flex items-center gap-3 group p-1.5 border-b border-border/30 last:border-0 hover:bg-sky-500/5 rounded transition-all duration-200 cursor-pointer",
                      activeRank === idx ? "bg-sky-500/10 scale-[1.02] shadow-sm z-10" : ""
                    )}
                    onMouseEnter={() => setActiveRank(idx)}
                    onMouseLeave={() => setActiveRank(null)}
                  >
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 border border-white/10 transition-all",
                      activeRank === idx ? "scale-125 shadow-md" : "shadow-sm"
                    )} style={{ backgroundColor: aifPalette[idx % aifPalette.length] }} />
                    <span className={cn(
                      "text-[10px] 2xl:text-[12px] font-bold truncate max-w-[150px] 2xl:max-w-[200px] transition-colors uppercase",
                      activeRank === idx ? "text-sky-600 dark:text-sky-300" : "text-muted-foreground group-hover:text-sky-500"
                    )}>
                      {item.name}
                    </span>
                    <span className={cn(
                      "text-[10px] 2xl:text-[12px] font-black ml-auto whitespace-nowrap transition-all",
                      activeRank === idx ? "text-sky-700 dark:text-sky-200 scale-110" : "text-sky-600 dark:text-sky-400"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Table */}
          <div className="xl:w-[72%] py-4">
            <div className="mb-4">
              <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 mb-2 tracking-widest opacity-90 border-l-4 border-sky-500 pl-3">Top {topN} DII - AIFs</h3>
            </div>

            <div className="border border-border rounded-xl shadow-xl flex flex-col bg-card overflow-hidden">
              <div className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar relative">
                <div className="w-full min-w-[800px]">
                  <Table>
                    <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-20 shadow-sm">
                      <TableRow className="hover:bg-transparent border-b border-white/10">
                        <TableHead rowSpan={2} className="w-14 text-center text-white font-bold border-r border-white/5 py-4 uppercase">Rank</TableHead>
                        <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 whitespace-normal py-4 w-[25%] uppercase">Shareholder Name</TableHead>
                        <TableHead colSpan={2} className={cn("text-center text-white font-bold border-r border-white/5 transition-colors uppercase", (metricView === 'holdings' || metricView === 'percentage') ? "bg-white/20" : "bg-white/10")}>
                          {detectedDates.latest}
                        </TableHead>
                        <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/5 py-2 whitespace-normal leading-tight uppercase">
                          {detectedDates.prev}
                        </TableHead>
                        <TableHead rowSpan={2} className={cn("text-center text-white font-bold py-4 whitespace-normal leading-tight max-w-[100px] transition-colors uppercase", metricView === 'change' ? "bg-white/20" : "")}>Change in Holding Shares</TableHead>
                      </TableRow>
                      <TableRow className="hover:bg-transparent text-[9px] 2xl:text-[10px] border-b border-white/10 uppercase">
                        <TableHead className={cn("text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal transition-all", (metricView === 'holdings' || metricView === 'all') ? "bg-sky-400/20 shadow-inner" : "")}>Holding</TableHead>
                        <TableHead className={cn("text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight transition-all", (metricView === 'percentage' || metricView === 'all') ? "bg-sky-400/20 shadow-inner" : "")}>% of Share Capital</TableHead>
                        <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal">Holding</TableHead>
                        <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% of Share Capital</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-card">
                      {processedData.slice(0, topN).map((row: any, idx: number) => (
                        <TableRow
                          key={row.name}
                          className="hover:bg-muted/50 transition-colors duration-200 border-b border-border last:border-0"
                        >
                          <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-4 whitespace-normal">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-sky-300 border-r border-border py-4 leading-tight whitespace-normal w-[25%] uppercase">{row.name}</TableCell>

                          {/* Metric Highlighting */}
                          <TableCell className={cn(
                            "text-center font-mono font-bold text-[12px] 2xl:text-[14px] border-r border-border py-4 whitespace-normal transition-colors",
                            (metricView === 'holdings' || metricView === 'all')
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                              : "text-foreground"
                          )}>{row.holdings.toLocaleString()}</TableCell>
                          <TableCell className={cn(
                            "text-center font-mono font-bold text-[12px] 2xl:text-[14px] border-r border-border py-4 whitespace-normal transition-colors",
                            (metricView === 'percentage' || metricView === 'all')
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                              : "text-foreground"
                          )}>{row.percent.toFixed(2)}%</TableCell>

                          {/* Previous Date Data */}
                          <TableCell className="text-center font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border py-4 whitespace-normal">{row.prevHoldings.toLocaleString()}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border py-4 whitespace-normal">{row.prevPercent.toFixed(2)}%</TableCell>

                          <TableCell className={cn(
                            "text-center font-mono font-black text-[12px] 2xl:text-[14px] py-4 whitespace-normal transition-colors",
                            metricView === 'change'
                              ? "bg-sky-500/15"
                              : ""
                          )}>
                            {row.change === 0 ? '-' : (
                              row.change < 0
                                ? <span className="text-rose-600 font-bold">{Math.abs(row.change).toLocaleString()}L</span>
                                : <span className="text-foreground dark:text-white font-black">{Math.abs(row.change).toLocaleString()}L</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
