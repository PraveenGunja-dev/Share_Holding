import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
  LabelList, PieChart, Pie, Legend
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ArrowUp, ArrowDown, TrendingDown } from 'lucide-react';
import { getTopSellers, getTopBuyers } from '../services/api';
import { useEffect, useState } from 'react';
import { cn, formatDateRange , formatName} from "./ui/utils";
import { getCategoryColor, CATEGORY_COLORS } from '../constants/colors';

interface TopSellersProps {
  selectedCategories: string[];
  topN: number;
  dateRange: string;
  buId?: number;
}


export function TopSellers({ selectedCategories, topN, dateRange, buId }: TopSellersProps) {
  const [liveData, setLiveData] = useState<any[]>([]);
  const [totalBought, setTotalBought] = useState(0);
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
          <h2 className="text-xl 2xl:text-2xl font-[1000] text-primary dark:text-sky-400 tracking-tighter leading-none mb-0.5 shadow-sm inline-block transition-all">Top {topN} Sellers</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-80 tracking-widest">
            Shares disposed {detectedDates.latest && detectedDates.prev ? `(${detectedDates.prev} vs ${detectedDates.latest})` : `(${formatDateRange(dateRange)})`}
          </p>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-rose-600">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0">Total shares sold</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-rose-400">
              {Math.abs(totalSold).toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-orange-500">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0">Total sellers</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-rose-400">
              {filteredData.length}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Investors</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-rose-400">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 truncate" title={filteredData[0]?.name}>
              Top: {filteredData[0]?.name || '—'}
            </div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-rose-400">
              {filteredData[0] ? (filteredData[0].sold >= 1000 ? `${(filteredData[0].sold / 1000).toFixed(1)}k` : filteredData[0].sold.toLocaleString()) : '—'}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 bg-card border-border shadow-[0_8px_30px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-base 2xl:text-lg font-black text-primary dark:text-sky-400">Top {topN} Sellers</h3>
            <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold tracking-[0.2em] mt-1 opacity-80">Shares sold (in lakhs)</p>
          </div>

          {/* Category Color Legend - Moved from bottom to header */}
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
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-black text-primary dark:text-sky-400 tracking-wider">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FULL WIDTH Chart Container — Lollipop Style matching TopBuyers */}
        <div className="w-full mt-6" style={{ height: chartH }}>
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
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
                tick={{ fontSize: 12, fontWeight: 900, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              >
                <Label value="Shares Sold (Lakhs)" offset={-25} position="insideBottom" fontSize={13} fontWeight={900} fill="var(--muted-foreground)" style={{ opacity: 0.9 }} />
              </XAxis>
              <YAxis
                dataKey="name"
                type="category"
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
                width={yAxisWidth}
                tickLine={false}
                axisLine={false}
                interval={0}
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
                  return (
                    <g>
                      {/* The Stick */}
                      <rect x={x} y={y + height / 2 - 1.5} width={barWidth} height={3} fill={fill} rx={1.5} />
                      {/* The Head (Circle) */}
                      <circle cx={x + barWidth} cy={y + height / 2} r={6} fill={fill} stroke="white" strokeWidth={2} />
                      {/* Outer Glow */}
                      <circle cx={x + barWidth} cy={y + height / 2} r={10} fill={fill} fillOpacity={0.15} />
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

      {/* TABLE */}
      <Card className="p-3 2xl:p-4 bg-card border-border shadow-[0_4px_20px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
        <h3 className="text-[11px] 2xl:text-xs font-black text-primary dark:text-sky-400 mb-2 tracking-wider opacity-90">Top {filteredData.length} Sellers (Detailed View)</h3>
        <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden">
          <div className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar relative">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-20 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead rowSpan={2} className="w-16 font-bold text-white text-center border-r border-white/5 py-4">Rank</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 min-w-[250px] py-4">Shareholder Name</TableHead>
                    <TableHead rowSpan={2} className="font-bold text-white border-r border-white/5 py-4">Category</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-white border-r border-white/5 py-4 bg-sky-500/20">Shares Sold during the Week</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold text-white border-r border-white/5 bg-white/10 py-2">{detectedDates.latest}</TableHead>
                    <TableHead colSpan={2} className="text-center font-bold text-white bg-white/5 py-2">{detectedDates.prev}</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b border-white/10">
                    <TableHead className="text-center font-bold text-white border-r border-white/5 text-[10px] py-1.5">Holding</TableHead>
                    <TableHead className="text-center font-bold text-white border-r border-white/5 text-[10px] py-1.5">% of Share Capital</TableHead>
                    <TableHead className="text-center font-bold text-white border-r border-white/5 text-[10px] py-1.5">Holding</TableHead>
                    <TableHead className="text-center font-bold text-white text-[10px] py-1.5">% of Share Capital</TableHead>
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
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] 2xl:text-[11px] font-bold tracking-tighter" style={{ backgroundColor: `${getCategoryColor(row.category)}15`, color: getCategoryColor(row.category) }}>{row.category}</div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-center border-r border-border font-mono font-black text-[11px] 2xl:text-[13px] py-2 transition-all",
                        activeRank === idx 
                          ? "bg-sky-500/30 text-sky-800 dark:text-sky-200 scale-105 shadow-inner" 
                          : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      )}>
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
        </div>
      </Card>
    </div>
  );
}