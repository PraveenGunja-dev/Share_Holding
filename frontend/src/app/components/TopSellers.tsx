import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
  PieChart, Pie, Legend
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ArrowUp, ArrowDown, TrendingDown } from 'lucide-react';
import { getTopSellers, getTopBuyers } from '../services/api';
import { useEffect, useState, useMemo } from 'react';
import { cn, formatDateRange, formatName } from "./ui/utils";
import { getCategoryColor } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

interface TopSellersProps {
  selectedCategories: string[];
  topN: number;
  dateRange: string;
  buId?: number;
}


export function TopSellers({ selectedCategories, topN, dateRange, buId }: TopSellersProps) {
  const { theme } = useTheme();
  const [liveData, setLiveData] = useState<any[]>([]);
  const [totalBought, setTotalBought] = useState(0);
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

  // Standardized height to match Institutional Bars (800px)
  const chartH = 800;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [sellersRes, buyersRes] = await Promise.all([getTopSellers(buId, dateRange), getTopBuyers(buId, dateRange)]);

        if (!sellersRes || sellersRes.length === 0) return;

        const sample = sellersRes[0];
        const drString = sample["DateRange"] || "";
        if (drString.includes(' vs ')) {
          const parts = drString.split(' vs ');
          setDetectedDates({ latest: parts[1], prev: parts[0] });
        } else {
          setDetectedDates({ latest: "Latest", prev: "Previous" });
        }

        const aggregated: Record<string, any> = {};

        sellersRes.forEach((item: any) => {
          const findValue = (possibleKeys: string[]) => {
            for (const key of possibleKeys) {
              if (item[key] !== undefined && item[key] !== null) return item[key];
              const foundKey = Object.keys(item).find(k => k.toLowerCase() === key.toLowerCase());
              if (foundKey) return item[foundKey];
            }
            return "0";
          };

          const name = formatName((item["Name of Holder"] || item["Institution"] || item["Shareholder Name"] || "Unknown").trim());
          if (name === "Unknown") return;

          const subCat = (item["Sub Category"] || "").trim();
          const mainCat = (item["Category"] || "").trim();
          const catLabel = (item["Category Label"] || "").trim();
          let uiCategory = catLabel || subCat || mainCat || "Others";

          const soldStr = findValue(["Sold Shares", "Shares Disposed during the Week", "Sell", "Sell Shares"]);
          const soldValue = Math.abs(parseFloat(String(soldStr).replace(/,/g, ''))) || 0;

          const pCur = parseFloat(item["% of Sh. Cap (Current)"] || item["Latest Percent"] || item["% of Share Capital"] || 0);
          const pPrev = parseFloat(item["% of Sh. Cap (Previous)"] || item["Previous Percent"] || 0);
          const curH = parseFloat(String(item["Current"] || 0).replace(/,/g, '')) || 0;
          const prevH = parseFloat(String(item["Previous"] || 0).replace(/,/g, '')) || 0;

          if (!aggregated[name]) {
            aggregated[name] = {
              name,
              category: uiCategory,
              sold: soldValue,
              totalHoldings: curH,
              prevHoldings: prevH,
              percent: pCur,
              prevPercent: pPrev,
              changeAmt: soldValue
            };
          } else {
            // Deduplicate: If row is identical, Math.max will keep the value without doubling.
            aggregated[name].sold = Math.max(aggregated[name].sold, soldValue);
            aggregated[name].totalHoldings = Math.max(aggregated[name].totalHoldings, curH);
            aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings || 0, prevH);
            aggregated[name].percent = Math.max(aggregated[name].percent, pCur);
            aggregated[name].prevPercent = Math.max(aggregated[name].prevPercent || 0, pPrev);
            aggregated[name].changeAmt = Math.max(aggregated[name].changeAmt, soldValue);
          }
        });

        const finalSellers = Object.values(aggregated);
        setLiveData(finalSellers.sort((a: any, b: any) => b.sold - a.sold));

        if (buyersRes && buyersRes.length > 0) {
          const buyersSum = buyersRes.reduce((acc: number, curr: any) => {
            const bVal = parseFloat(String(curr["Buy Shares"] || curr["Buy"] || 0).replace(/,/g, '')) || 0;
            return acc + bVal;
          }, 0);
          setTotalBought(buyersSum);
        }

      } catch (error) {
        console.error("Failed to fetch dashboard flow:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange, buId]);

  const filteredData = liveData
    .filter(item => selectedCategories.length === 0 || selectedCategories.includes(item.category))
    .slice(0, topN); // Dynamic Top N

  const totalSold = filteredData.reduce((acc, curr) => acc + curr.sold, 0);

  const donutData = useMemo(() => {
    const categories = Array.from(new Set(filteredData.map(d => d.category)));
    return categories.map(cat => ({
      name: cat === 'Alternative Investment Funds' ? 'AIF' :
            cat === 'Sovereign Wealth Funds' ? 'SWF' :
            cat === 'Mutual Funds' ? 'MF' : cat,
      value: filteredData
        .filter(d => d.category === cat)
        .reduce((acc, curr) => acc + curr.sold, 0),
      color: getCategoryColor(cat)
    })).filter(d => d.value > 0);
  }, [filteredData]);

  const maxSellValue = Math.max(...filteredData.map(d => d.sold), 1);
  const trackValue = maxSellValue * 1.15;

  const baseChartData = filteredData
    .map((d, index) => ({
      name: d.name,
      value: d.sold,
      category: d.category,
      rank: index + 1,
      maxValue: trackValue
    }));

  const chartData = [...baseChartData];
  while (chartData.length < topN) {
    chartData.push({
      name: `—`,
      value: 0,
      category: 'Others',
      rank: chartData.length + 1,
      maxValue: trackValue
    });
  }

  return (
    <div id="sellers" className="space-y-4 transition-all duration-300 text-slate-100">
      {/* Header Row: Title on Left, KPIs on Right */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 transition-all">Top {topN} Sellers</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest">
            Shares disposed {detectedDates.latest && detectedDates.prev ? `(${detectedDates.prev} vs ${detectedDates.latest})` : `(${formatDateRange(dateRange)})`}
          </p>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-rose-600 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total shares sold</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-rose-400">
              {Math.abs(totalSold).toLocaleString()}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-orange-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total sellers</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-rose-400">
              {filteredData.length}
              <span className="text-[9px] font-black text-foreground ml-1">Investors</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-rose-400 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 truncate uppercase" title={filteredData[0]?.name}>
              Top Seller: {filteredData[0]?.name || '—'}
            </div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-rose-400">
              {filteredData[0] ? (filteredData[0].sold >= 1000 ? `${(filteredData[0].sold / 1000).toFixed(1)}k` : filteredData[0].sold.toLocaleString()) : '—'}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
        </div>
      </div>

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

        {/* FULL WIDTH Chart Container — Lollipop Style matching TopBuyers */}
        <div className="w-full mt-4" style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={chartMargin}
              barCategoryGap="15%"
            >
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
                tick={{ fontSize: 12, fontWeight: 900, fill: 'var(--foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              >
                <Label value="SHARES SOLD (LAKHS)" offset={-25} position="insideBottom" fontSize={13} fontWeight={900} fill="var(--foreground)" style={{ opacity: 1 }} />
              </XAxis>
              <YAxis
                dataKey="name"
                type="category"
                tick={({ x, y, payload, index }: any) => {
                  let text = payload.value;
                  const maxLen = isMobile ? 15 : 120; // Increased maxLen
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
                width={yAxisWidth}
                tickLine={false}
                axisLine={{ stroke: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,32,91,0.2)', strokeWidth: 1 }}
                interval={0}
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
                        {d.value.toLocaleString()} <span className="text-[13px] text-muted-foreground uppercase">Lakhs Sold</span> <span className="text-rose-500">▼</span>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Lollipop Bar: matching TopBuyers structure */}
              <Bar
                dataKey="value"
                name="Shares Sold"
                barSize={3}
                animationDuration={1500}
                shape={(props: any) => {
                  const { x, y, width, height, fill, value } = props;
                  if (value === 0 || isNaN(width)) return <g />;
                  const barWidth = width;
                  const cy = y + height / 2 + 4;
                  const cx = x + barWidth;
                  const labelText = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
                  return (
                    <g>
                      {/* The Stick */}
                      <rect x={x} y={cy - 1.5} width={barWidth} height={3} fill={fill} rx={1.5} />
                      {/* The Head (Circle) */}
                      <circle cx={cx} cy={cy} r={6} fill={fill} stroke="white" strokeWidth={2} />
                      {/* Outer Glow */}
                      <circle cx={cx} cy={cy} r={10} fill={fill} fillOpacity={0.15} />
                      {/* Value Label with Arrow — same cy as circle for perfect alignment */}
                      <text x={cx + 18} y={cy} dominantBaseline="central" textAnchor="start" fontSize={13} fontWeight={900} fill="#ef4444">
                        {labelText} ▼
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

      {/* TABLE */}
      <Card className="p-3 2xl:p-4 bg-card border-border shadow-[0_4px_20px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
        <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 mb-2 tracking-wider opacity-90">Top {filteredData.length} Sellers (Detailed View)</h3>
        <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden">
          <div className="flex-1 max-h-[500px] overflow-auto custom-scrollbar relative">
            <Table className="relative">
              <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-30 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead rowSpan={2} className="w-16 font-bold text-white text-center border-r border-white/5 py-4 text-[13px] font-['Adani']">Rank</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 min-w-[250px] py-4 text-[13px] font-['Adani']">Shareholder Name</TableHead>
                    <TableHead rowSpan={2} className="text-center text-white font-bold border-r border-white/5 py-4 text-[13px] font-['Adani']">Category</TableHead>
                    <TableHead rowSpan={2} className="text-center text-white font-bold border-r border-white/5 py-4 bg-sky-500/20 text-[13px] font-['Adani']">Shares Sold during the Week</TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/10 py-2 text-[13px] font-['Adani']">{detectedDates.latest}</TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold bg-white/5 py-2 text-[13px] font-['Adani']">{detectedDates.prev}</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead className="text-center text-white font-bold border-r border-white/5 py-1.5 text-[13px] font-['Adani']">Holding</TableHead>
                    <TableHead className="text-center text-white font-bold border-r border-white/5 py-1.5 text-[13px] font-['Adani']">% of Share Capital</TableHead>
                    <TableHead className="text-center text-white font-bold border-r border-white/5 py-1.5 text-[13px] font-['Adani']">Holding</TableHead>
                    <TableHead className="text-center text-white text-[13px] font-bold py-1.5 font-['Adani']">% of Share Capital</TableHead>
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
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tighter" style={{ backgroundColor: `${getCategoryColor(row.category)}15`, color: getCategoryColor(row.category) }}>{row.category}</div>
                      </TableCell>
                      <TableCell className="text-center border-r border-border font-mono font-black text-[11px] 2xl:text-[13px] py-2 transition-colors bg-sky-500/10 text-sky-700 dark:text-sky-400">
                        {Math.abs(row.sold).toLocaleString()}
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
                      <TableCell className="text-center font-mono font-bold text-[11px] 2xl:text-[13px] text-muted-foreground border-r border-border py-2">
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