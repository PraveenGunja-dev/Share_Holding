import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label, LabelList, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowUp, ArrowDown, TrendingUp, Users, PieChart, Globe, Landmark, Compass, ShieldCheck, Coins, Briefcase, Building2 } from 'lucide-react';
import { getFIIHolders } from '../services/api';
import { useEffect, useState } from 'react';
import { cn , formatName} from "./ui/utils";
import { useTheme } from '../context/ThemeContext';
import { ReferenceLine } from 'recharts';
import { getCategoryColor } from '../constants/colors';

interface TopFIIsProps {
  topN: number;
  metricView: string;
  dateRange: string;
  buId?: number;
}

export function TopFIIs({ topN, metricView, dateRange, buId }: TopFIIsProps) {
  const { theme } = useTheme();
  const [liveData, setLiveData] = useState<any[]>([]);
  const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '', prevPrev: '' });
  const [activeRank, setActiveRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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

  const chartMargin = isMobile
    ? { left: 40, right: 40, bottom: 40, top: 10 }
    : isTablet
      ? { left: 60, right: 60, bottom: 40, top: 10 }
      : { left: 80, right: 60, bottom: 40, top: 15 };

  const yAxisWidth = isMobile ? 180 : isTablet ? 320 : 450;

  // Increased vertical height per item to ensure all 20 names are visible/don't overlap
  const chartH = Math.max(isUltraWide ? 500 : 440, topN * (isUltraWide ? 32 : 28));

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const rawData = await getFIIHolders(buId, dateRange);
        if (!rawData || rawData.length === 0) {
          setLoading(false);
          return;
        }

        const sample = rawData[0];
        const drString = sample["DateRange"] || "";
        if (drString.includes(' vs ')) {
          const parts = drString.split(' vs ');
          setDetectedDates({ latest: parts[1], prev: parts[0], prevPrev: parts[0] });
        } else {
          setDetectedDates({ latest: "Latest", prev: "Previous", prevPrev: "Previous" });
        }

        const aggregated: Record<string, any> = {};

        rawData.forEach((item: any) => {
          const name = (item["Institution"] || item["Name of Holder"] || item["Name"] || "").trim();
          if (!name || name === "Unknown") return;

          const hLatest = parseFloat(String(item["Current"] || 0).replace(/,/g, '')) || 0;
          const hPrev = parseFloat(String(item["Previous"] || 0).replace(/,/g, '')) || 0;
          const hPrevPrev = hPrev;
          const pCur = parseFloat(item["% of Sh. Cap (Current)"] || item["Latest Percent"] || item["% of Share Capital"] || 0);
          const pPrev = parseFloat(item["% of Sh. Cap (Previous)"] || item["Previous Percent"] || 0);
          const buyVal = parseFloat(String(item["Buy"] || 0).replace(/,/g, '')) || 0;
          const sellVal = parseFloat(String(item["Sell"] || 0).replace(/,/g, '')) || 0;

          if (!aggregated[name]) {
            aggregated[name] = {
              name,
              category: item["Category Label"] || item["Category"] || "FII",
              holdings: hLatest,
              prevHoldings: hPrev,
              prevPrevHoldings: hPrevPrev,
              percent: pCur,
              prevPercent: pPrev,
              buy: buyVal,
              sell: sellVal,
              change: pCur - pPrev
            };
          } else {
            // Deduplicate logic
            aggregated[name].holdings = Math.max(aggregated[name].holdings, hLatest);
            aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings, hPrev);
            aggregated[name].prevPrevHoldings = Math.max(aggregated[name].prevPrevHoldings, hPrevPrev);
            aggregated[name].percent = Math.max(aggregated[name].percent, pCur);
            aggregated[name].prevPercent = Math.max(aggregated[name].prevPercent, pPrev);
            aggregated[name].buy = Math.max(aggregated[name].buy, buyVal);
            aggregated[name].sell = Math.max(aggregated[name].sell, sellVal);
            aggregated[name].change = aggregated[name].percent - aggregated[name].prevPercent;
          }
        });

        setLiveData(Object.values(aggregated));
      } catch (e) {
        console.error("FII fetch failed:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange, buId]);

  const allFIIs = liveData;
  const filteredRankings = [...allFIIs].sort((a, b) => b.holdings - a.holdings).slice(0, topN);

  const baseChartData = filteredRankings.map((fii, idx) => {
    let activeVal = fii.holdings;
    let label = `${fii.holdings.toLocaleString()}L`;

    if (metricView === 'percentage') {
      activeVal = fii.percent;
      label = `${fii.percent.toFixed(2)}%`;
    } else if (metricView === 'change') {
      activeVal = Math.abs(fii.buy - fii.sell);
      label = `${(fii.buy - fii.sell) > 0 ? '+' : ''}${(fii.buy - fii.sell).toLocaleString()}L`;
    }

    return {
      name: fii.name,
      value: activeVal,
      holdings: fii.holdings,
      category: fii.category,
      label: label,
      rank: idx + 1
    };
  });

  const maxVal = Math.max(...baseChartData.map(d => d.value), 1);
  const trackValue = maxVal * 1.15;

  // Pad data up to topN to ensure all 20 rows are visible in the layout
  const chartData = baseChartData.map(d => ({ ...d, maxValue: trackValue }));
  while (chartData.length < topN) {
    chartData.push({
      name: `—`,
      value: 0,
      holdings: 0,
      category: 'Others',
      label: '—',
      rank: chartData.length + 1,
      maxValue: trackValue
    });
  }

  const totalFIIHoldings = allFIIs.reduce((acc, curr) => acc + curr.holdings, 0);
  const thisWeekWoW = allFIIs.reduce((acc, curr) => acc + (curr.holdings - curr.prevHoldings), 0);

  const getCategoryIcon = (category: string) => {
    const cat = category?.toUpperCase() || '';
    if (cat.includes('FII')) return Globe;
    if (cat.includes('FPI')) return Compass;
    if (cat.includes('SWF') || cat.includes('SOVEREIGN')) return Landmark;
    if (cat.includes('MF') || cat.includes('MUTUAL')) return Coins;
    if (cat.includes('INSURANCE')) return ShieldCheck;
    if (cat.includes('AIF')) return Briefcase;
    if (cat.includes('FI')) return Building2;
    return Users;
  };
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    let text = payload.value;
    const maxLen = dimensions.width < 768 ? 12 : dimensions.width < 1024 ? 24 : 35;
    if (text.length > maxLen) {
      text = text.substring(0, maxLen) + '...';
    }
    const fontSize = 13;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-12}
          y={4}
          dominantBaseline="central"
          textAnchor="end"
          fontSize={fontSize}
          fontWeight={500}
          fill={theme === 'dark' ? '#38bdf8' : '#00205B'}
          style={{ letterSpacing: '0.01em' }}
        >
          {text.toUpperCase()}
        </text>
      </g>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse tracking-widest">Updating FII Intelligence...</div>;


  return (
    <div id="fiis" className="space-y-4 transition-all duration-300">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 inline-block transition-all">Top {topN} FIIs & FPIs</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest leading-relaxed">Institutional Investment Analysis - Performance & Holdings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-orange-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total FII/FPI holdings</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {totalFIIHoldings.toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-sky-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Change in holding shares</div>
            <div className={cn("text-base 2xl:text-lg font-black", thisWeekWoW >= 0 ? "text-primary dark:text-sky-400" : "text-rose-600 dark:text-rose-400")}>
              {Math.abs(thisWeekWoW).toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-blue-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Number of FII/FPI</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {liveData.length}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Investors</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-3 bg-card border-border shadow-[0_4px_20px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
        <div className="w-full mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <h3 className="text-sm 2xl:text-base font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest uppercase border-l-4 border-primary dark:border-sky-500 pl-3">FII & FPI HOLDINGS DISTRIBUTION</h3>
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 dark:bg-slate-900/50 border border-border/50 shadow-sm self-start md:self-auto">
            {Array.from(new Set(liveData.map(d => d.category))).slice(0, 8).map((cat: string) => (
              <div key={cat} className="flex items-center gap-1.5 border-r border-border/30 last:border-0 pr-3 last:pr-0">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getCategoryColor(cat) }} />
                <span className="text-[9px] 2xl:text-[10px] font-black text-primary dark:text-sky-300 tracking-tighter">
                  {cat === 'Alternative Investment Funds' ? 'AIF' :
                    cat === 'Insurance Companies' ? 'INS' :
                      cat === 'Mutual Funds' ? 'MF' :
                        cat === 'Provident Funds' ? 'PF' :
                          cat === 'Institutional Investors' ? 'IF' : cat}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full" style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={chartMargin}
              style={{ overflow: 'visible' }}
              onMouseMove={(state) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const name = state.activePayload[0].payload.name;
                  const idx = filteredRankings.findIndex(d => d.name === name);
                  setActiveRank(idx !== -1 ? idx : null);
                }
              }}
              onMouseLeave={() => setActiveRank(null)}
            >
              <defs>
                <linearGradient id="fiiGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={1} />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} opacity={0.3} />
              
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                tick={{ fontSize: isMobile ? 10 : 13, fontWeight: 900, fill: theme === 'dark' ? '#ffffff' : '#475569' }}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
                tickLine={false}
              >
                <Label
                  value={(metricView === 'percentage' ? '% Share Capital' : metricView === 'change' ? 'Change in Shares' : 'Lakhs Owned (Scale)').toUpperCase()}
                  offset={-15}
                  position="insideBottom"
                  style={{ fontSize: '13px', fontWeight: 500, fill: theme === 'dark' ? '#ffffff' : '#475569', letterSpacing: '0.1em' }}
                />
              </XAxis>
              <YAxis
                dataKey="name"
                type="category"
                width={yAxisWidth}
                tick={<CustomYAxisTick />}
                axisLine={false}
                tickLine={false}
                interval={0}
              >
                <Label
                  value={"FIIs & FPIs Shareholders".toUpperCase()}
                  angle={-90}
                  position="insideLeft"
                  offset={-15}
                  style={{ textAnchor: 'middle', fontSize: '13px', fontWeight: 500, fill: 'var(--muted-foreground)', letterSpacing: '0.1em', opacity: 0.7 }}
                />
              </YAxis>
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
                itemStyle={{ color: 'var(--card-foreground)', fontSize: '13px', fontWeight: 500 }}
                labelStyle={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}
                formatter={(v: any) => [`${v.toLocaleString()}${metricView === 'percentage' ? '%' : ' Lakhs'}`, metricView === 'percentage' ? 'Share Capital' : 'Holdings']}
              />

              {/* Background Track */}
              <Bar dataKey="maxValue" xAxisId={0} fill="var(--muted)" fillOpacity={0.1} barSize={20} radius={[10, 10, 10, 10]} isAnimationActive={false} tooltipType="none" />

              {/* Gradient Bullet Bar */}
              <Bar 
                dataKey="value" 
                name={metricView === 'percentage' ? '% Share Capital' : 'Holdings'} 
                barSize={20}
                animationDuration={1500}
                radius={[0, 10, 10, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === '—' ? 'transparent' : "url(#fiiGradient)"} 
                    style={{ filter: 'url(#shadow)' }}
                  />
                ))}
                <LabelList
                  dataKey="label"
                  position="right"
                  formatter={(v: string) => v === '—' ? '' : v}
                  style={{ fontSize: '13px', fontWeight: 500, fill: 'var(--foreground)' }}
                  offset={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 bg-card border-border shadow-sm">
        <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 mb-4 tracking-widest opacity-90 border-l-4 border-orange-500 pl-4">Top {topN} FIIs & FPIs​</h3>
        <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden">
          <div className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar relative">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 transition-all sticky top-0 z-20 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10 text-white uppercase">
                    <TableHead rowSpan={2} className="w-16 font-bold text-white text-center border-r border-white/5 py-4">Rank</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 min-w-[200px] py-4">Shareholder Name</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 py-4">Category</TableHead>
                    <TableHead colSpan={2} className={cn("text-center font-bold text-white border-r border-white/5 transition-colors uppercase", (metricView === 'holdings' || metricView === 'percentage') ? "bg-white/20" : "bg-white/10")}>{detectedDates.latest}</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold text-white border-r border-white/5 bg-white/5 py-2 uppercase">{detectedDates.prev}</TableHead>
                    <TableHead rowSpan={2} className={cn("text-center font-bold text-white py-4 transition-colors uppercase", metricView === 'change' ? "bg-white/20" : "")}>Change in Holding Shares</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b border-white/10 text-[10px] text-white/80 uppercase">
                    <TableHead className={cn("text-center font-bold text-white/80 border-r border-white/5 py-2 transition-all uppercase", metricView === 'holdings' ? "bg-sky-400/20" : "")}>Holding (L)</TableHead>
                    <TableHead className={cn("text-center font-bold text-white/80 border-r border-white/5 py-2 transition-all uppercase", metricView === 'percentage' ? "bg-sky-400/20" : "")}>% of Share Capital</TableHead>
                    <TableHead className="text-center font-bold text-white/80 border-r border-white/5 py-2">Holding (L)</TableHead>
                    <TableHead className="text-center font-bold text-white/80 border-r border-white/5 py-2">% of Share Capital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {filteredRankings.map((row: any, idx: number) => (
                    <TableRow 
                      key={row.name} 
                      className={cn(
                        "hover:bg-muted/50 transition-all duration-200 border-b border-border last:border-0 group",
                        activeRank === idx && "bg-sky-500/[0.08] dark:bg-sky-400/[0.12] border-l-4 border-l-sky-500 scale-[1.005] z-10 shadow-sm"
                      )}
                      onMouseEnter={() => setActiveRank(idx)}
                      onMouseLeave={() => setActiveRank(null)}
                    >
                      <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-2">{idx + 1}</TableCell>
                      <TableCell className="py-2 border-r border-border max-w-[140px] sm:max-w-[180px] lg:max-w-[220px] 2xl:max-w-[300px]">
                        <div className="font-black text-[12px] 2xl:text-[14px] text-primary dark:text-sky-300 truncate uppercase" title={row.name}>{row.name}</div>
                      </TableCell>
                      <TableCell className="border-r border-border py-2">
                        <div
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] 2xl:text-[11px] font-bold tracking-tighter uppercase"
                          style={{ backgroundColor: `${getCategoryColor(row.category)}15`, color: getCategoryColor(row.category) }}
                        >
                          {row.category}
                        </div>
                      </TableCell>
                      
                      {/* Highlighted Cells based on Metric */}
                      <TableCell className={cn(
                        "text-center border-r border-border font-mono font-black text-[11px] 2xl:text-[13px] py-2 transition-all",
                        (metricView === 'holdings' || metricView === 'all')
                          ? (activeRank === idx ? "bg-sky-500/30 text-sky-800 dark:text-sky-200 scale-[1.02] shadow-inner" : "bg-sky-500/15 text-sky-700 dark:text-sky-400") 
                          : "text-foreground"
                      )}>
                        {row.holdings.toLocaleString()}
                      </TableCell>
                      <TableCell className={cn(
                        "text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border py-2 transition-all",
                        (metricView === 'percentage' || metricView === 'all')
                          ? (activeRank === idx ? "bg-sky-500/30 text-sky-800 dark:text-sky-200 scale-[1.02] shadow-inner" : "bg-sky-500/15 text-sky-700 dark:text-sky-400") 
                          : "text-foreground"
                      )}>
                        {row.percent.toFixed(2)}%
                      </TableCell>

                      <TableCell className="text-center border-r border-border font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground py-2">
                        {row.prevHoldings.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border py-2">
                        {row.prevPercent.toFixed(2)}%
                      </TableCell>
                      <TableCell className={cn(
                        "text-center font-mono font-black text-[11px] 2xl:text-[13px] py-2 transition-all",
                        metricView === 'change' 
                          ? (activeRank === idx ? "bg-sky-500/30 font-black scale-[1.02] shadow-inner" : "bg-sky-500/15") 
                          : ""
                      )}>
                        {row.sell > 0 ? (
                          <span className="text-rose-600">{Math.abs(row.sell).toLocaleString()}</span>
                        ) : row.buy > 0 ? (
                          <span className="text-foreground dark:text-white font-black">{Math.abs(row.buy).toLocaleString()}</span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}