import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Label, PieChart, Pie
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, Users, Trophy } from 'lucide-react';
import { getTopBuyers, getTopSellers } from '../services/api';
import { useEffect, useState, useMemo } from 'react';
import { getCategoryColor } from '../constants/colors';
import { cn, formatName } from "./ui/utils";
import { useTheme } from '../context/ThemeContext';

interface TopBuyersProps {
  selectedCategories: string[];
  topN: number;
  dateRange: string;
  buId?: number;
}


export function TopBuyers({ selectedCategories, topN, dateRange, buId }: TopBuyersProps) {
  const { theme } = useTheme();
  const [liveData, setLiveData] = useState<any[]>([]);
  const [totalSoldVal, setTotalSoldVal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '' });

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
    ? { left: 10, right: 40, bottom: 60, top: 40 }
    : { left: 50, right: 60, bottom: 60, top: 40 };

  const yAxisWidth = isMobile ? 150 : isTablet ? 320 : 430;

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

  const chartData = baseChartData;

  const fmtVal = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString();

  const maxVal = Math.max(...chartData.map(d => d.value), 0);

  const chartH = Math.max(200, chartData.length * 45 + 50);

  const donutData = useMemo(() => {
    const categories = Array.from(new Set(filteredData.map(d => d.category)));
    return categories.map(cat => ({
      name: cat === 'Alternative Investment Funds' ? 'AIF' :
            cat === 'Sovereign Wealth Funds' ? 'SWF' :
            cat === 'Mutual Funds' ? 'MF' : cat,
      value: filteredData
        .filter(d => d.category === cat)
        .reduce((acc, curr) => acc + curr.bought, 0),
      color: getCategoryColor(cat)
    })).filter(d => d.value > 0);
  }, [filteredData]);

  return (
    <div id="buyers" className="space-y-4 transition-all duration-300 text-slate-100">
      {/* Header Row: Title on Left, KPIs on Right */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 inline-block transition-all">Top {topN} Buyers</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest leading-relaxed">Shares acquired (Percent %)</p>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-sky-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total shares acquired</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {Math.abs(totalBought).toLocaleString()}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-sky-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total buyers</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {filteredData.length}
              <span className="text-[9px] font-black text-foreground ml-1">Investors</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-blue-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 truncate uppercase" title={topBuyer?.name}>
              Top Buyer: {topBuyer?.name || '—'}
            </div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {topBuyer ? fmtVal(topBuyer.bought) : '—'}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Horizontal Bar Chart ── */}
      <Card className="p-4 bg-card border-border shadow-[0_8px_30px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)]">
        {/* Ownership Mix ribbon — matching InstitutionalHolders */}
        <div className="flex items-center justify-between gap-4 mb-4 bg-muted/20 dark:bg-slate-900/40 p-2 rounded-xl border border-border/40 shadow-sm backdrop-blur-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            {donutData.length > 0 && (
              <div className="h-[50px] w-[50px] 2xl:h-[65px] 2xl:w-[65px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={12}
                      outerRadius={24}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1000}
                    >
                      {donutData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: string) => [`${v.toLocaleString()} Lakhs`, name]}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        padding: '8px 12px'
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 500, color: 'var(--card-foreground)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[12px] 2xl:text-[14px] font-black text-primary dark:text-sky-400 tracking-[0.15em] uppercase">Ownership Mix</span>
              <span className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-60 uppercase">Distribution by category</span>
            </div>
          </div>

          <div className="flex items-center gap-6 pr-2">
            {donutData.map((d: any) => (
              <div key={d.name} className="flex items-center gap-2 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                <span className="text-[12px] 2xl:text-[14px] font-black text-foreground whitespace-nowrap tracking-tight uppercase">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FULL WIDTH Chart Container — Lollipop Style */}
        <div className="w-full mt-4" style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={chartMargin}
              barCategoryGap="15%"
            >
              <defs>
                {Array.from(new Set(chartData.map(d => d.category))).map(cat => (
                  <filter key={`glow-${cat}`} id={`glow-${cat}`}>
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
                tick={{ fontSize: 12, fontWeight: 900, fill: 'var(--foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              >
                <Label value="SHARES ACQUIRED (LAKHS)" offset={-25} position="insideBottom" fontSize={13} fontWeight={900} fill="var(--foreground)" style={{ opacity: 1 }} />
              </XAxis>

              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth}
                tick={({ x, y, payload, index }: any) => {
                  let text = payload.value;
                  const maxLen = dimensions.width < 768 ? 15 : 120; // Increased maxLen
                  if (text.length > maxLen) {
                    text = text.substring(0, maxLen) + '...';
                  }
                  const rank = (index ?? 0) + 1;
                  const fontSize = 13;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-25} y={4} dominantBaseline="central" textAnchor="end" fontSize={fontSize} fontWeight={900} fill={theme === 'dark' ? '#38bdf8' : '#00205B'} style={{ fontFamily: 'Adani', letterSpacing: '0.01em' }}>
                        {formatName(text)}
                      </text>
                    </g>
                  );
                }}
                tickLine={false}
                axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,32,91,0.2)', strokeWidth: 1 }}
              >
                <Label value="INSTITUTIONAL SHAREHOLDERS" angle={-90} position="insideLeft" offset={-40} style={{ textAnchor: 'middle', fontSize: 13, fontWeight: 900, fontFamily: 'Adani', fill: 'var(--foreground)', opacity: 1 }} />
              </YAxis>

              <Tooltip
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-xl p-4 shadow-xl backdrop-blur-md bg-opacity-90">
                      <div className="text-[13px] font-medium text-muted-foreground mb-2 tracking-widest uppercase">{d.category}</div>
                      <div className="text-[13px] font-medium text-primary dark:text-sky-400 mb-1 leading-tight uppercase">{d.name}</div>
                      <div className="text-[13px] font-medium text-card-foreground uppercase">
                        {d.value.toLocaleString()} <span className="text-[13px] text-muted-foreground uppercase">Lakhs Bought</span> <span className="text-emerald-500">▲</span>
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
                  const cy = y + height / 2 + 4;
                  const cx = x + width;
                  const labelText = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
                  return (
                    <g>
                      {/* The Stick */}
                      <rect x={x} y={cy - 1.5} width={width} height={3} fill={fill} rx={1.5} />
                      {/* The Head (Circle) */}
                      <circle cx={cx} cy={cy} r={6} fill={fill} stroke="white" strokeWidth={2} />
                      {/* Outer Glow */}
                      <circle cx={cx} cy={cy} r={10} fill={fill} fillOpacity={0.15} />
                      {/* Value Label with Arrow — same cy as circle for perfect alignment */}
                      <text x={cx + 18} y={cy} dominantBaseline="central" textAnchor="start" fontSize={13} fontWeight={900} fill="#10b981">
                        {labelText} ▲
                      </text>
                    </g>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>


      </Card>

      {/* ── DETAILED TABLE ── */}
      <Card className="p-3 2xl:p-4 bg-card border-border shadow-[0_4px_20px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
        <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 mb-2 tracking-wider opacity-90">Top {filteredData.length} Buyers (Detailed View)</h3>
        <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden">
          <div className="max-h-[500px] overflow-auto custom-scrollbar relative">
            <Table className="relative">
              <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-30 shadow-sm">
                <TableRow className="hover:bg-transparent border-b border-white/10">
                  <TableHead rowSpan={2} className="w-16 font-bold text-white text-center border-r border-white/5 py-4 text-[13px] font-['Adani']">Rank</TableHead>
                  <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 min-w-[250px] py-4 text-[13px] font-['Adani']">Shareholder Name</TableHead>
                  <TableHead rowSpan={2} className="text-center text-white font-bold border-r border-white/5 py-4 text-[13px] font-['Adani']">Category</TableHead>
                  <TableHead rowSpan={2} className="text-center text-white font-bold border-r border-white/5 py-4 bg-sky-500/20 text-[13px] font-['Adani']">Shares Acquired during the Week</TableHead>
                  <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/10 py-2 text-[13px] font-['Adani']">{detectedDates.latest}</TableHead>
                  <TableHead colSpan={2} className="text-center text-white font-bold bg-white/5 py-2 text-[13px] font-['Adani']">{detectedDates.prev}</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-b border-white/10">
                  <TableHead className="text-center text-white font-bold border-r border-white/5 py-1.5 text-[13px] font-['Adani']">Holding</TableHead>
                  <TableHead className="text-center text-white font-bold border-r border-white/5 py-1.5 text-[13px] font-['Adani']">% of Share Capital</TableHead>
                  <TableHead className="text-center text-white font-bold border-r border-white/5 py-1.5 text-[13px] font-['Adani']">Holding</TableHead>
                  <TableHead className="text-center text-white font-bold py-1.5 text-[13px] font-['Adani']">% of Share Capital</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card">
                {filteredData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors duration-200"
                  >
                      <TableCell className="text-center font-black text-muted-foreground text-[13px] font-['Adani'] border-r border-border py-2">{idx + 1}</TableCell>
                      <TableCell className="py-2 border-r border-border min-w-[200px] max-w-[300px]">
                        <div className="font-bold text-[13px] font-['Adani'] text-primary dark:text-sky-300 whitespace-normal leading-tight">{formatName(row.name)}</div>
                      </TableCell>
                      <TableCell className="border-r border-border py-2">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tighter"
                        style={{ backgroundColor: `${getCategoryColor(row.category)}15`, color: getCategoryColor(row.category) }}>
                        {row.category}
                      </div>
                    </TableCell>
                    <TableCell className="text-center border-r border-border font-mono font-black text-[11px] 2xl:text-[13px] py-2 transition-colors bg-sky-500/10 text-sky-700 dark:text-sky-400">
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