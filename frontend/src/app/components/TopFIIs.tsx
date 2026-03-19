import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label, PieChart, Pie, LabelList } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { getFIIHolders } from '../services/api';
import { useEffect, useState, useMemo } from 'react';
import { cn , formatName} from "./ui/utils";
import { useTheme } from '../context/ThemeContext';
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
  const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '' });
  const [activeRank, setActiveRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const rawData = await getFIIHolders(buId, dateRange);
        if (!rawData || rawData.length === 0) { setLoading(false); return; }
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
          const name = (item["Institution"] || item["Name of Holder"] || "").trim();
          if (!name || name === "Unknown") return;
          const hLatest = parseFloat(String(item["Current"] || 0).replace(/,/g, '')) || 0;
          const hPrev = parseFloat(String(item["Previous"] || 0).replace(/,/g, '')) || 0;
          if (!aggregated[name]) {
            aggregated[name] = { name, category: item["Category Label"] || item["Category"] || "FII", holdings: hLatest, prevHoldings: hPrev, buy: parseFloat(item["Buy"] || 0), sell: parseFloat(item["Sell"] || 0), percent: parseFloat(item["% of Sh. Cap (Current)"] || 0), prevPercent: parseFloat(item["% of Sh. Cap (Previous)"] || 0) };
          } else {
            aggregated[name].holdings = Math.max(aggregated[name].holdings, hLatest);
            aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings, hPrev);
          }
        });
        setLiveData(Object.values(aggregated).sort((a,b)=>b.holdings - a.holdings));
      } catch (e) { console.error("FII fetch failed:", e); } finally { setLoading(false); }
    }
    fetchData();
  }, [dateRange, buId]);

  const filteredRankings = liveData.slice(0, topN);
  const availableCategories = useMemo(() => Array.from(new Set(liveData.map(d => d.category.trim().toUpperCase()))), [liveData]);
  const donutData = useMemo(() => {
    return availableCategories.map(cat => ({
      name: cat === 'ALTERNATIVE INVESTMENT FUNDS' ? 'AIF' : cat === 'SOVEREIGN WEALTH FUNDS' ? 'SWF' : cat === 'MUTUAL FUNDS' ? 'MF' : cat,
      value: liveData.filter(d => d.category.trim().toUpperCase() === cat).reduce((acc, curr) => acc + curr.holdings, 0),
      color: getCategoryColor(cat)
    })).filter(d => d.value > 0);
  }, [availableCategories, liveData]);

  const totalFIIHoldings = liveData.reduce((acc, curr) => acc + curr.holdings, 0);

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Updating FII Intelligence...</div>;

  return (
    <div id="fiis" className="space-y-8 transition-all duration-300">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1">
          <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 uppercase leading-none mb-1">Top {topN} FIIs & FPIs</h2>
          <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Institutional FII Analysis</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-sky-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total holdings</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-400">
              {totalFIIHoldings.toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-blue-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total Investors</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {liveData.length}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Entities</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-indigo-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Top Holder</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300 truncate" title={liveData[0]?.name}>
              {liveData[0]?.name || '—'}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 bg-card shadow-xl border-border">
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

        <div className="w-full transition-all duration-300" style={{ height: Math.max(200, filteredRankings.length * 45 + 50) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredRankings} layout="vertical" margin={{ left: 50, right: 80, bottom: 60, top: 40 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis type="number" tick={{ fontSize: 12, fontWeight: 900, fill: 'var(--muted-foreground)' }} axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }} tickLine={false}>
                <Label value="TOTAL HOLDINGS (LAKHS)" offset={-25} position="insideBottom" fontSize={13} fontWeight={900} fill="var(--muted-foreground)" style={{ opacity: 0.9 }} />
              </XAxis>
              <YAxis dataKey="name" type="category" width={430} tick={({ x, y, payload }: any) => (
                <g transform={`translate(${x},${y})`}>
                  <text x={-25} y={4} dominantBaseline="central" textAnchor="end" fontSize={13} fontWeight={900} fill={theme === 'dark' ? '#38bdf8' : '#00205B'} style={{ fontFamily: 'Adani' }}>{formatName(payload.value)}</text>
                </g>
              )} axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }} tickLine={false}>
                <Label value="INSTITUTIONAL SHAREHOLDERS" angle={-90} position="insideLeft" offset={-40} style={{ textAnchor: 'middle', fontSize: 13, fontWeight: 900, fontFamily: 'Adani', fill: 'var(--muted-foreground)', opacity: 0.7 }} />
              </YAxis>
              <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.1 }} />
              <Bar dataKey="holdings" barSize={3} shape={(props: any) => {
                const { x, y, width, height } = props;
                const cy = y + height / 2 + 4;
                return (
                  <g>
                    <rect x={x} y={cy - 1.5} width={width} height={3} fill="#0ea5e9" rx={1.5} />
                    <circle cx={x + width} cy={cy} r={6} fill="#0ea5e9" stroke="white" strokeWidth={2} />
                    <text x={x + width + 18} y={cy} dominantBaseline="central" textAnchor="start" fontSize={13} fontWeight={900} fill="#0ea5e9">{props.payload.holdings.toLocaleString()}L ▲</text>
                  </g>
                );
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden mt-8">
          <div className="max-h-[500px] overflow-auto custom-scrollbar relative">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 sticky top-0 z-30 shadow-sm">
                  <TableRow className="border-b border-white/10 text-white uppercase">
                    <TableHead rowSpan={2} className="w-16 text-center border-r font-bold text-white py-4 font-['Adani']">Rank</TableHead>
                    <TableHead rowSpan={2} className="border-r font-bold text-white py-4 w-[25%] font-['Adani']">Shareholder Name</TableHead>
                    <TableHead colSpan={2} className="text-center border-r font-bold text-white bg-white/10 py-2 font-['Adani']">{detectedDates.latest}</TableHead>
                    <TableHead colSpan={2} className="text-center border-r font-bold text-white bg-white/5 py-2 font-['Adani']">{detectedDates.prev}</TableHead>
                    <TableHead rowSpan={2} className="text-center font-bold text-white py-4 font-['Adani']">Change in Holding Shares</TableHead>
                  </TableRow>
                  <TableRow className="text-[10px] text-white/80 uppercase">
                    <TableHead className="text-center border-r py-2">Holding</TableHead>
                    <TableHead className="text-center border-r py-2">% of Share Capital</TableHead>
                    <TableHead className="text-center border-r py-2">Holding</TableHead>
                    <TableHead className="text-center border-r py-2">% of Share Capital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRankings.map((row, idx) => (
                    <TableRow key={row.name} className={cn("hover:bg-muted/50 border-b border-border last:border-0", activeRank === idx && "bg-sky-500/10")} onMouseEnter={() => setActiveRank(idx)} onMouseLeave={() => setActiveRank(null)}>
                      <TableCell className="text-center font-black py-2 border-r">{idx + 1}</TableCell>
                      <TableCell className="py-2 border-r font-black text-primary dark:text-sky-300">{formatName(row.name)}</TableCell>
                      <TableCell className="text-center border-r font-mono font-bold text-primary py-2">{row.holdings.toLocaleString()}L</TableCell>
                      <TableCell className="text-center border-r font-mono font-bold py-2">{row.percent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center border-r font-mono text-muted-foreground py-2">{row.prevHoldings.toLocaleString()}L</TableCell>
                      <TableCell className="text-center border-r font-mono text-muted-foreground py-2">{row.prevPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center py-2 font-black">{row.holdings - row.prevHoldings === 0 ? '-' : <span className={row.holdings - row.prevHoldings < 0 ? "text-rose-600" : "text-foreground"}>{Math.abs(row.holdings - row.prevHoldings).toLocaleString()}L</span>}</TableCell>
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