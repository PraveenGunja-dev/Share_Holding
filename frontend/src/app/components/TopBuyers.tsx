import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Label
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, Users, Trophy } from 'lucide-react';
import { getTopBuyers, getTopSellers } from '../services/api';
import { useEffect, useState } from 'react';
import { CATEGORY_COLORS, getCategoryColor } from '../constants/colors';
import { cn , formatName} from "./ui/utils";

interface TopBuyersProps {
  selectedCategories: string[];
  topN: number;
  dateRange: string;
  buId?: number;
}


export function TopBuyers({ selectedCategories, topN, dateRange, buId }: TopBuyersProps) {
  const [liveData, setLiveData] = useState<any[]>([]);
  const [totalSoldVal, setTotalSoldVal] = useState(0);
  const [loading, setLoading] = useState(true);
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
        const [buyersRes, sellersRes] = await Promise.all([
          getTopBuyers(buId, dateRange).catch(() => []),
          getTopSellers(buId, dateRange).catch(() => [])
        ]);

        const masterData = buyersRes.length > 0 ? buyersRes : sellersRes;
        if (!masterData || masterData.length === 0) { setLoading(false); return; }

        const sample = masterData[0];
        const drString = sample["DateRange"] || "";
        if (drString.includes(' vs ')) {
          const parts = drString.split(' vs ');
          setDetectedDates({ latest: parts[1], prev: parts[0] });
        } else {
          setDetectedDates({ latest: "Latest", prev: "Previous" });
        }

        if (buyersRes.length === 0) { setLiveData([]); setLoading(false); return; }

        const aggregated: Record<string, any> = {};
        buyersRes.forEach((item: any) => {
          const name = formatName((item["Name of Holder"] || item["Institution"] || item["Shareholder Name"] || "Unknown").trim());
          if (name === "Unknown") return;

          const subCat = (item["Sub Category"] || "").trim();
          const mainCat = (item["Category"] || "").trim();
          const catLabel = (item["Category Label"] || "").trim();
          const uiCategory = catLabel || subCat || mainCat || "Others";

          const getVal = (k: string) => Math.abs(parseFloat(String(item[k] || 0).replace(/,/g, ''))) || 0;
          const boughtKey = ["Buy Shares", "Bought Shares", "Buy", "Shares Acquired"].find(k => item[k] !== undefined) || "Buy Shares";
          const boughtValue = getVal(boughtKey);

          const pCur = parseFloat(item["% of Sh. Cap (Current)"] || item["Latest Percent"] || item["% of Share Capital"] || 0);
          const pPrev = parseFloat(item["% of Sh. Cap (Previous)"] || item["Previous Percent"] || 0);

          if (!aggregated[name]) {
            aggregated[name] = {
              name, category: uiCategory, bought: boughtValue,
              totalHoldings: getVal("Current"), percent: pCur,
              prevHoldings: getVal("Previous"), prevPercent: pPrev,
              rank: item["Sr.No"] || item["Rank"] || 0
            };
          } else {
            aggregated[name].bought = Math.max(aggregated[name].bought, boughtValue);
            aggregated[name].totalHoldings = Math.max(aggregated[name].totalHoldings, getVal("Current"));
            aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings || 0, getVal("Previous"));
            aggregated[name].percent = Math.max(aggregated[name].percent, pCur);
            aggregated[name].prevPercent = Math.max(aggregated[name].prevPercent || 0, pPrev);
          }
          aggregated[name].changeAmt = aggregated[name].bought;
        });

        setLiveData(Object.values(aggregated).sort((a: any, b: any) => b.bought - a.bought));

        if (sellersRes.length > 0) {
          const sum = sellersRes.reduce((acc: number, curr: any) => {
            const val = parseFloat(String(curr["Sold Shares"] || curr["Sell"] || 0).replace(/,/g, '')) || 0;
            return acc + Math.abs(val);
          }, 0);
          setTotalSoldVal(sum);
        }
      } catch (error) {
        console.error("Critical error in TopBuyers fetchData:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange, buId]);

  const filteredData = liveData
    .filter(item => (selectedCategories.length === 0 || selectedCategories.includes(item.category)) &&
      item.category !== 'SWF' && item.category !== 'Sovereign Wealth Funds')
    .slice(0, topN);

  const totalBought = filteredData.reduce((acc, curr) => acc + curr.bought, 0);
  const topBuyer = filteredData[0] ?? null;

  const baseChartData = filteredData.map((d, idx) => ({
    name: d.name,
    rank: idx + 1,
    value: d.bought,
    category: d.category,
  }));

  // Pad data up to topN to ensure all 20 rows are visible in the layout
  const chartData = [...baseChartData];
  while (chartData.length < topN) {
    chartData.push({
      name: `—`,
      rank: chartData.length + 1,
      value: 0,
      category: 'Others'
    });
  }

  const fmtVal = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString();

  // Dynamic chart height: 32px per row, min 480px — tighter on large screens
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 1;

  return (
    <div id="buyers" className="space-y-4 transition-all duration-300 text-slate-100">
      {/* Header Row: Title on Left, KPIs on Right */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] text-primary dark:text-sky-400 tracking-tighter leading-none mb-0.5 shadow-sm inline-block transition-all">Top {topN} Buyers</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest">Shares acquired (Percent %)</p>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-sky-500">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0">Total shares acquired</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {Math.abs(totalBought).toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-sky-500">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0">Total buyers</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {filteredData.length}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Investors</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-blue-500">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 truncate" title={topBuyer?.name}>
              Top: {topBuyer?.name || '—'}
            </div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300 leading-none">
              {topBuyer ? fmtVal(topBuyer.bought) : '—'}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Horizontal Bar Chart ── */}
      <Card className="p-4 bg-card border-border shadow-[0_8px_30px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] 2xl:text-[13px] text-muted-foreground font-bold tracking-[0.2em] mt-1 opacity-80">
              Shares acquired (in lakhs) — Ranked 1 to {topN} top to bottom
            </p>
          </div>

          {/* Category Color Legend */}
          <div className="flex flex-wrap items-center gap-4 bg-muted/20 dark:bg-slate-800/40 px-4 py-2 rounded-xl border border-border/50">
            {[
              { label: 'FII', color: CATEGORY_COLORS['FII'] },
              { label: 'MF', color: CATEGORY_COLORS['DII-MF'] },
              { label: 'INS', color: CATEGORY_COLORS['DII-Insurance'] },
              { label: 'PF', color: CATEGORY_COLORS['DII-PF'] },
              { label: 'IF', color: CATEGORY_COLORS['DII-IF'] },
              { label: 'AIF', color: CATEGORY_COLORS['DII-AIF'] },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-black text-primary dark:text-sky-400 tracking-wider">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FULL WIDTH Chart Container — Lollipop Style */}
        <div className="w-full" style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={chartMargin}
              barCategoryGap="15%"
              onMouseMove={(state) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const name = state.activePayload[0].payload.name;
                  const idx = filteredData.findIndex(d => d.name === name);
                  setActiveRank(idx !== -1 ? idx : null);
                }
              }}
              onMouseLeave={() => setActiveRank(null)}
            >
              <defs>
                {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                  <filter key={`glow-${key}`} id={`glow-${key}`}>
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" horizontal={false} opacity={0.5} />

              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
                tick={{ fontSize: 12, fontWeight: 900, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              >
                <Label value="Shares Acquired (Lakhs)" offset={-25} position="insideBottom" fontSize={13} fontWeight={900} fill="var(--muted-foreground)" style={{ opacity: 0.9 }} />
              </XAxis>

              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth}
                tick={({ x, y, payload, index }: any) => {
                  let text = payload.value;
                  const maxLen = dimensions.width < 768 ? 12 : dimensions.width < 1024 ? 24 : 35;
                  if (text.length > maxLen) {
                    text = text.substring(0, maxLen) + '...';
                  }
                  const rank = (index ?? 0) + 1;
                  const fontSize = 13;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-12} y={3} textAnchor="end" fontSize={fontSize} fontWeight={500} fill={dimensions.width > 0 ? '#00205B' : '#38bdf8'} style={{ letterSpacing: '0.01em' }}>
                        {text}
                      </text>
                    </g>
                  );
                }}
                tickLine={false}
                axisLine={false}
              >
                <Label value="Institutional Shareholders" angle={-90} position="insideLeft" offset={-15} style={{ textAnchor: 'middle', fontSize: 13, fontWeight: 500, fill: 'var(--muted-foreground)', opacity: 0.7 }} />
              </YAxis>

              <Tooltip
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-xl p-4 shadow-xl backdrop-blur-md bg-opacity-90">
                      <div className="text-[13px] font-medium text-muted-foreground mb-2 tracking-widest">{d.category}</div>
                      <div className="text-[13px] font-medium text-primary dark:text-sky-400 mb-1 leading-tight">{d.name}</div>
                      <div className="text-[13px] font-medium text-card-foreground">
                        {d.value.toLocaleString()} <span className="text-[13px] text-muted-foreground">Lakhs</span>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Lollipop Bar: Thin bar with a Circle head */}
              <Bar 
                dataKey="value" 
                barSize={3} 
                animationDuration={1500}
                shape={(props: any) => {
                  const { x, y, width, height, fill, value } = props;
                  if (value === 0) return <g />;
                  return (
                    <g>
                      {/* The Stick */}
                      <rect x={x} y={y + height / 2 - 1.5} width={width} height={3} fill={fill} rx={1.5} />
                      {/* The Head (Circle) */}
                      <circle cx={x + width} cy={y + height / 2} r={6} fill={fill} stroke="white" strokeWidth={2} />
                      {/* Outer Glow */}
                      <circle cx={x + width} cy={y + height / 2} r={10} fill={fill} fillOpacity={0.15} />
                    </g>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => v === 0 ? '' : (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString())}
                  style={{ fontSize: '13px', fontWeight: 500, fill: 'var(--foreground)' }}
                  offset={15}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>


      </Card>

        {/* ── DETAILED TABLE ── */}
        <Card className="p-3 2xl:p-4 bg-card border-border shadow-[0_4px_20px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
          <h3 className="text-[11px] 2xl:text-xs font-black text-primary dark:text-sky-400 mb-2 uppercase tracking-wider opacity-90">Top {filteredData.length} Buyers (Detailed View)</h3>
          <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar relative">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-20 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead rowSpan={2} className="w-16 font-bold text-white text-center border-r border-white/5 py-4">Rank</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 min-w-[250px] py-4">Shareholder Name</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 py-4">Category</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-white border-r border-white/5 py-4 bg-sky-500/20">Shares Acquired during the Week</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold text-white border-r border-white/5 bg-white/10 py-2">{detectedDates.latest}</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold text-white bg-white/5 py-2">{detectedDates.prev}</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead className="text-center font-bold text-white border-r border-white/5 text-[10px] uppercase py-1.5">Holding</TableHead>
                    <TableHead className="text-center font-bold text-white border-r border-white/5 text-[10px] uppercase py-1.5">% of Share Capital</TableHead>
                    <TableHead className="text-center font-bold text-white border-r border-white/5 text-[10px] uppercase py-1.5">Holding</TableHead>
                    <TableHead className="text-center font-bold text-white text-[10px] uppercase py-1.5">% of Share Capital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {filteredData.map((row, idx) => (
                    <TableRow 
                      key={idx} 
                      className={cn(
                        "hover:bg-muted/50 border-b border-border last:border-0 transition-all duration-200",
                        activeRank === idx && "bg-sky-500/[0.15] dark:bg-sky-400/[0.15] border-l-4 border-l-sky-500 scale-[1.01] shadow-md z-10"
                      )}
                      onMouseEnter={() => setActiveRank(idx)}
                      onMouseLeave={() => setActiveRank(null)}
                    >
                      <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-2">{idx + 1}</TableCell>
                      <TableCell className="py-2 border-r border-border max-w-[140px] sm:max-w-[180px] lg:max-w-[220px] 2xl:max-w-[300px]">
                        <div className="font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-sky-300 truncate" title={row.name}>{row.name}</div>
                      </TableCell>
                      <TableCell className="border-r border-border py-2">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] 2xl:text-[11px] font-bold uppercase tracking-tighter"
                          style={{ backgroundColor: `${getCategoryColor(row.category)}15`, color: getCategoryColor(row.category) }}>
                          {row.category}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-center border-r border-border font-mono font-black text-[11px] 2xl:text-[13px] py-2 transition-all",
                        activeRank === idx 
                          ? "bg-sky-500/30 text-sky-800 dark:text-sky-200 scale-105 shadow-inner" 
                          : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      )}>
                        {row.bought.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center border-r border-border font-mono font-bold text-[11px] 2xl:text-[13px] text-foreground py-2">
                        {row.totalHoldings.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-[11px] 2xl:text-[13px] text-foreground border-r border-border py-2">
                        {row.percent.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center border-r border-border font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground py-2">
                        {row.prevHoldings.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground py-2">
                        {row.prevPercent.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
    </div>
  );
}