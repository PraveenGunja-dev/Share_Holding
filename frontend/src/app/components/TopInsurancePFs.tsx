import { Card } from './ui/card';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell, PieChart, Pie } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { getInsurancePFHolders } from '../services/api';
import { useEffect, useState, useMemo } from 'react';
import { cn , formatName} from "./ui/utils";
import { getCategoryColor } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

interface TopInsurancePFsProps {
  topN: number;
  metricView: string;
  dateRange: string;
  buId?: number;
}

export function TopInsurancePFs({ topN, metricView, dateRange, buId }: TopInsurancePFsProps) {
  const { theme } = useTheme();
  const [liveData, setLiveData] = useState<any[]>([]);
  const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '' });

  useEffect(() => {
    async function fetchData() {
      try {
        const rawData = await getInsurancePFHolders(buId, dateRange);
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
          const name = (item["Institution"] || item["Name of Holder"] || "").trim();
          if (!name || name === "Unknown") return;
          const hCur = Math.abs(parseFloat(String(item["Current"] || 0).replace(/,/g, ''))) || 0;
          const hPre = Math.abs(parseFloat(String(item["Previous"] || 0).replace(/,/g, ''))) || 0;
          if (!aggregated[name]) {
            const rawCat = (item["Category Label"] || item["Category"] || "").toUpperCase();
            aggregated[name] = { name, type: rawCat.includes("PF") || rawCat.includes("PROVIDENT") ? 'Provident Fund' : 'Insurance', holdings: hCur, prevHoldings: hPre, percent: parseFloat(item["% of Sh. Cap (Current)"] || 0), prevPercent: parseFloat(item["% of Sh. Cap (Previous)"] || 0), buy: parseFloat(item["Buy"] || 0), sell: parseFloat(item["Sell"] || 0) };
          } else {
            aggregated[name].holdings = Math.max(aggregated[name].holdings, hCur);
            aggregated[name].prevHoldings = Math.max(aggregated[name].prevHoldings, hPre);
          }
        });
        setLiveData(Object.values(aggregated));
      } catch (e) { console.error("Insurance PF Fetch failed:", e); }
    }
    fetchData();
  }, [dateRange, buId]);

  const [selectedView, setSelectedView] = useState<'Insurance' | 'PF'>('Insurance');
  const currentViewData = liveData.filter(d => d.type === (selectedView === 'Insurance' ? 'Insurance' : 'Provident Fund')).sort((a, b) => b.holdings - a.holdings);
  const filteredRankings = currentViewData.slice(0, topN);

  const totalHoldings = currentViewData.reduce((a, c) => a + c.holdings, 0);

  // Chart data: entities on X-axis, holdings on Y-axis — creates a flowing mountain shape
  const areaChartData = useMemo(() => {
    return filteredRankings.map(d => ({
      name: formatName(d.name),
      latest: d.holdings,
      previous: d.prevHoldings,
      change: d.holdings - d.prevHoldings
    }));
  }, [filteredRankings]);

  return (
    <div id="insurance" className="space-y-8 transition-all duration-300">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1 space-y-4">
          <div><h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 uppercase leading-none mb-1">Insurance & PF</h2><p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Institutional Portfolio Analysis</p></div>
          <div className="flex p-1 bg-muted/40 backdrop-blur-sm rounded-xl border border-border w-fit shadow-inner">
            <button onClick={() => setSelectedView('Insurance')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", selectedView === 'Insurance' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}>INSURANCE</button>
            <button onClick={() => setSelectedView('PF')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", selectedView === 'PF' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}>PROVIDENT</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-fuchsia-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total holdings</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-fuchsia-400">
              {totalHoldings.toLocaleString()}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-fuchsia-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Total investors</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-fuchsia-400">
              {currentViewData.length}
              <span className="text-[9px] font-black text-foreground ml-1">Entities</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col justify-center shrink-0 border-r-4 border-r-purple-500 h-[85px]">
            <div className="text-[8px] 2xl:text-[9px] font-black text-foreground tracking-widest mb-0.5 leading-none px-0 truncate uppercase" title={filteredRankings[0]?.name}>
              Top Holder: {filteredRankings[0] ? formatName(filteredRankings[0].name) : '—'}
            </div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-fuchsia-400 leading-none">
              {filteredRankings[0] ? filteredRankings[0].holdings.toLocaleString() : '—'}
              <span className="text-[9px] font-black text-foreground ml-1">Lakhs</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 bg-card shadow-xl border-border">
        {/* Header ribbon */}
        <div className="flex items-center justify-between gap-4 mb-4 bg-muted/20 dark:bg-slate-900/40 p-2 rounded-xl border border-border/40 shadow-sm backdrop-blur-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[12px] 2xl:text-[14px] font-black text-primary dark:text-sky-400 tracking-[0.15em] uppercase">Holdings Distribution</span>
              <span className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-60 uppercase">Ranked by holdings — Area Chart</span>
            </div>
          </div>
          <div className="flex items-center gap-6 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-2.5 rounded-sm" style={{ backgroundColor: selectedView === 'Insurance' ? '#d946ef' : '#6366f1' }} />
              <span className="text-[12px] 2xl:text-[14px] font-black text-foreground tracking-tight uppercase">{detectedDates.latest || 'Latest'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2.5 rounded-sm opacity-40" style={{ backgroundColor: selectedView === 'Insurance' ? '#d946ef' : '#6366f1' }} />
              <span className="text-[12px] 2xl:text-[14px] font-black text-muted-foreground tracking-tight uppercase">{detectedDates.prev || 'Previous'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2.5 rounded-sm bg-slate-900 dark:bg-slate-200" />
              <span className="text-[12px] 2xl:text-[14px] font-black text-slate-900 dark:text-slate-200 tracking-tight uppercase">Buy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2.5 rounded-sm bg-rose-500" />
              <span className="text-[12px] 2xl:text-[14px] font-black text-rose-600 dark:text-rose-400 tracking-tight uppercase">Sell</span>
            </div>
          </div>
        </div>

        {/* Composed Chart — Area + Change Bars */}
        <div className="w-full transition-all duration-300" style={{ height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={areaChartData} margin={{ left: 20, right: 30, bottom: 80, top: 20 }}>
              <defs>
                <linearGradient id="gradLatest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedView === 'Insurance' ? '#d946ef' : '#6366f1'} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={selectedView === 'Insurance' ? '#d946ef' : '#6366f1'} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedView === 'Insurance' ? '#a855f7' : '#818cf8'} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={selectedView === 'Insurance' ? '#a855f7' : '#818cf8'} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--foreground)', fontFamily: 'Adani' }}
                axisLine={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 900, fill: 'var(--foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const latest = payload.find((p: any) => p.dataKey === 'latest');
                  const previous = payload.find((p: any) => p.dataKey === 'previous');
                  const change = payload.find((p: any) => p.dataKey === 'change');
                  const changeVal = change ? Number(change.value) : 0;
                  return (
                    <div style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      padding: '12px 16px',
                      fontFamily: 'Adani'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--primary)', marginBottom: '6px' }}>{label}</div>
                      {latest && (
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#c026d3', marginBottom: '3px' }}>
                          {detectedDates.latest || 'Latest'}: {Number(latest.value).toLocaleString()} Lakhs
                        </div>
                      )}
                      {previous && (
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '3px' }}>
                          {detectedDates.prev || 'Previous'}: {Number(previous.value).toLocaleString()} Lakhs
                        </div>
                      )}
                      {change && (
                        <div style={{ fontSize: '12px', fontWeight: 900, color: changeVal > 0 ? 'var(--foreground)' : changeVal < 0 ? '#ef4444' : 'var(--muted-foreground)' }}>
                          {changeVal > 0 ? 'Buy ▲' : changeVal < 0 ? 'Sell ▼' : 'No Change'}: {Math.abs(changeVal).toLocaleString()} Lakhs
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="previous"
                stroke={selectedView === 'Insurance' ? '#a855f7' : '#818cf8'}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#gradPrev)"
                animationDuration={1200}
              />
              <Area
                type="monotone"
                dataKey="latest"
                stroke={selectedView === 'Insurance' ? '#d946ef' : '#6366f1'}
                strokeWidth={2.5}
                fill="url(#gradLatest)"
                animationDuration={1500}
                dot={{ r: 3, fill: selectedView === 'Insurance' ? '#d946ef' : '#6366f1', stroke: 'white', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: selectedView === 'Insurance' ? '#d946ef' : '#6366f1', stroke: 'white', strokeWidth: 2 }}
              />
              <Bar dataKey="change" barSize={14} animationDuration={1500} radius={[3, 3, 0, 0]}>
                {areaChartData.map((entry: any, index: number) => (
                  <Cell key={`bar-${index}`} fill={entry.change >= 0 ? '#080808ff' : '#ef4444'} fillOpacity={0.7} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-border rounded-xl shadow-md overflow-hidden bg-card mt-8">
          <div className="max-h-[500px] overflow-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-primary dark:bg-slate-900 sticky top-0 z-30">
                <TableRow className="hover:bg-transparent border-b border-white/10 text-white uppercase">
                  <TableHead rowSpan={2} className="w-16 text-center border-r border-white/5 font-bold text-white py-4 font-['Adani']">Rank</TableHead>
                  <TableHead rowSpan={2} className="border-r border-white/5 font-bold text-white py-4 w-[25%] font-['Adani']">Shareholder Name</TableHead>
                  <TableHead colSpan={2} className="text-center border-r border-white/5 font-bold text-white bg-white/10 py-2 font-['Adani']">{detectedDates.latest}</TableHead>
                  <TableHead colSpan={2} className="text-center border-r border-white/5 font-bold text-white bg-white/5 py-2 font-['Adani']">{detectedDates.prev}</TableHead>
                  <TableHead rowSpan={2} className="text-center font-bold text-white py-4 font-['Adani']">Change in Holding Shares</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent text-[9px] 2xl:text-[10px] border-b border-white/10 uppercase">
                  <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal bg-fuchsia-400/20">Holding</TableHead>
                  <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% of Share Capital</TableHead>
                  <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal">Holding</TableHead>
                  <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2.5 whitespace-normal leading-tight">% of Share Capital</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRankings.map((row, idx) => (
                  <TableRow key={row.name} className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors">
                    <TableCell className="text-center border-r font-black py-2">{idx + 1}</TableCell>
                    <TableCell className="py-2 border-r font-black text-primary dark:text-sky-300">{formatName(row.name)}</TableCell>
                    <TableCell className="text-center border-r font-mono font-bold text-fuchsia-600 py-2">{row.holdings.toLocaleString()}L</TableCell>
                    <TableCell className="text-center border-r font-mono font-bold py-2">{row.percent.toFixed(2)}%</TableCell>
                    <TableCell className="text-center border-r font-mono text-muted-foreground py-2">{row.prevHoldings.toLocaleString()}L</TableCell>
                    <TableCell className="text-center border-r font-mono text-muted-foreground py-2">{row.prevPercent.toFixed(2)}%</TableCell>
                    <TableCell className="text-center py-2 font-black">
                      {row.holdings - row.prevHoldings === 0 ? '-' : <span className={row.holdings - row.prevHoldings < 0 ? "text-rose-600" : "text-foreground"}>{Math.abs(row.holdings - row.prevHoldings).toLocaleString()}L</span>}
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