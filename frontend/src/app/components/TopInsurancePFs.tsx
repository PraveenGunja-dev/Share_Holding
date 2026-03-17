import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell, LabelList,
  PieChart, Pie
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { TrendingUp, Users, PieChart as PieIcon, ShieldCheck, Activity } from 'lucide-react';
import { getInsurancePFHolders } from '../services/api';
import { useEffect, useState } from 'react';
import { cn , formatName} from "./ui/utils";
import { getCategoryColor } from '../constants/colors';

interface TopInsurancePFsProps {
  topN: number;
  metricView: string;
  dateRange: string;
  buId?: number;
}

export function TopInsurancePFs({ topN, metricView, dateRange, buId }: TopInsurancePFsProps) {
  const [liveData, setLiveData] = useState<any[]>([]);
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
          const name = (item["Institution"] || item["Name of Holder"] || item["Name"] || "").trim();
          if (!name || name === "Unknown") return;

          const curH = parseFloat(String(item["Current"] || 0).replace(/,/g, '')) || 0;
          const preH = parseFloat(String(item["Previous"] || 0).replace(/,/g, '')) || 0;
          const pCur = parseFloat(item["% of Sh. Cap (Current)"] || item["Latest Percent"]) || 0;
          const pPrev = parseFloat(item["% of Sh. Cap (Previous)"] || item["Previous Percent"]) || 0;
          const buyVal = parseFloat(item["Buy"]) || 0;
          const sellVal = parseFloat(item["Sell"]) || 0;

          if (!aggregated[name]) {
            const rawCat = (item["Category Label"] || item["Category"] || "").toUpperCase();
            const subCat = (item["Sub Category"] || "").toUpperCase();

            // Fix: Intelligent type detection that handles "DII-" prefix
            let type = 'Insurance'; // Default
            if (rawCat.includes("PROVIDENT") || subCat.includes("PROVIDENT") || rawCat.includes("PF") || subCat.includes("PF")) {
              type = 'Provident Fund';
            } else if (rawCat.includes("INSURANCE") || subCat.includes("INSURANCE")) {
              type = 'Insurance';
            }

            aggregated[name] = {
              name,
              type,
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

        setLiveData(Object.values(aggregated));
      } catch (e) { console.error("Insurance/PF fetch failed:", e); }
    }
    fetchData();
  }, [dateRange, buId]);

  const [selectedView, setSelectedView] = useState<'Insurance' | 'PF'>('Insurance');

  // Filter and process data based on selected view
  const currentViewData = liveData
    .filter(d => d.type === (selectedView === 'Insurance' ? 'Insurance' : 'Provident Fund'))
    .sort((a, b) => b.holdings - a.holdings);

  const totalHoldings = currentViewData.reduce((a, c) => a + c.holdings, 0);
  const totalPercent = currentViewData.reduce((a, c) => a + c.percent, 0);
  const totalPrevHoldings = currentViewData.reduce((a, c) => a + (c.prevHoldings || 0), 0);
  const totalPrevPercent = currentViewData.reduce((a, c) => a + (c.prevPercent || 0), 0);

  const wowChange = totalHoldings - totalPrevHoldings;
  const wowPercentChange = totalPercent - totalPrevPercent;

  const largestHolder = currentViewData[0];

  return (
    <div id="insurance" className="space-y-6 transition-all duration-300">
      {/* Header Row: Title/Toggle on Left, KPIs on Right */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-border pb-2 mb-3">
        <div className="pb-1 space-y-4">
          <div>
            <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1 inline-block">Insurance & PF</h2>
            <p className="text-[11px] 2xl:text-[13px] text-muted-foreground font-bold opacity-80 tracking-widest">Holdings by {selectedView === 'Insurance' ? 'Insurance Funds' : 'Provident Funds'}</p>
          </div>

          <div className="flex p-1 bg-muted/40 backdrop-blur-sm rounded-xl border border-border w-fit shadow-inner">
            <button
              onClick={() => setSelectedView('Insurance')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all duration-300 tracking-wider",
                selectedView === 'Insurance'
                  ? "shadow-lg scale-105"
                  : "text-muted-foreground hover:text-primary"
              )}
              style={selectedView === 'Insurance' ? { backgroundColor: getCategoryColor('DII-Insurance'), color: 'white' } : {}}
            >
              Insurance
            </button>
            <button
              onClick={() => setSelectedView('PF')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all duration-300 tracking-wider",
                selectedView === 'PF'
                  ? "shadow-lg scale-105"
                  : "text-muted-foreground hover:text-primary"
              )}
              style={selectedView === 'PF' ? { backgroundColor: getCategoryColor('DII-PF'), color: 'white' } : {}}
            >
              Provident
            </button>
          </div>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 min-h-[85px] h-full"
            style={{ borderRightColor: selectedView === 'Insurance' ? getCategoryColor('DII-Insurance') : getCategoryColor('DII-PF') }}>
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none uppercase">Total holdings</div>
            <div className="text-base 2xl:text-lg font-black" style={{ color: selectedView === 'Insurance' ? getCategoryColor('DII-Insurance') : getCategoryColor('DII-PF') }}>
              {totalHoldings.toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className="p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 border-r-sky-500 min-h-[85px] h-full">
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none px-0 uppercase">Change in holding shares</div>
            <div className={cn("text-base 2xl:text-lg font-black", wowChange >= 0 ? "text-primary dark:text-sky-400" : "text-rose-600 dark:text-rose-400")}>
              {Math.abs(wowChange).toLocaleString()}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Lakhs</span>
            </div>
          </Card>
          <Card className={cn(
            "p-2.5 bg-card border border-border shadow-sm flex flex-col shrink-0 border-r-4 min-h-[85px] h-full",
            selectedView === 'Insurance' ? "border-r-fuchsia-500" : "border-r-blue-500"
          )}>
            <div className="text-[8px] 2xl:text-[9px] font-bold text-muted-foreground tracking-widest mb-0.5 leading-none uppercase">Active investors</div>
            <div className="text-base 2xl:text-lg font-black text-primary dark:text-sky-300">
              {currentViewData.length}
              <span className="text-[9px] font-bold text-muted-foreground ml-1">Entities</span>
            </div>
          </Card>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card className="p-4 bg-card shadow-xl border-border relative overflow-hidden">
        <div className="w-full mb-6">
          <h3 className="text-sm 2xl:text-base font-black font-['Adani'] text-primary dark:text-sky-400 tracking-widest uppercase border-l-4 border-primary dark:border-sky-500 pl-3">INSURANCE & PROVIDENT FUND ANALYSIS</h3>
        </div>
        <div className="mb-6">
          <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 border-l-4 border-primary dark:border-sky-500 pl-3 tracking-widest opacity-90">
            {selectedView === 'Insurance' ? `Top ${topN} Insurance Company Holdings` : `Top ${topN} Provident Fund Holdings`}
          </h3>
        </div>

        <div className="border border-border rounded-xl shadow-2xl flex flex-col bg-card overflow-hidden">
          <div className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar relative">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-20 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b border-white/10 uppercase">
                    <TableHead rowSpan={2} className="w-16 text-center text-white font-bold border-r border-white/5 py-4">Rank</TableHead>
                    <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 min-w-[300px] py-4">Shareholder Name</TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/10 py-2">
                      {detectedDates.latest}
                    </TableHead>
                    <TableHead colSpan={2} className="text-center text-white font-bold border-r border-white/5 bg-white/5 py-2">
                      {detectedDates.prev}
                    </TableHead>
                    <TableHead rowSpan={2} className="text-center text-white font-bold py-4">Change in Holding Shares</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent text-[10px] 2xl:text-[11px] border-b border-white/10 uppercase">
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2">Holding (L)</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2">% of Share Capital</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2">Holding (L)</TableHead>
                    <TableHead className="text-center text-white/80 font-bold border-r border-white/5 py-2">% of Share Capital</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentViewData.slice(0, topN).map((row, idx) => (
                    <TableRow key={row.name} className={cn(
                      "hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                    )}>
                      <TableCell className="text-center font-black text-muted-foreground text-[12px] 2xl:text-[14px] border-r border-border py-4">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-[13px] 2xl:text-[15px] text-primary dark:text-sky-300 border-r border-border py-4 leading-tight uppercase">{row.name}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-[12px] 2xl:text-[14px] text-foreground border-r border-border py-4">{row.holdings.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-[12px] 2xl:text-[14px] text-foreground border-r border-border py-4">{row.percent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-mono font-bold text-[12px] 2xl:text-[14px] text-muted-foreground border-r border-border py-4">{row.prevHoldings.toLocaleString()}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-[12px] 2xl:text-[14px] text-muted-foreground border-r border-border py-4">{row.prevPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-mono font-black text-[12px] 2xl:text-[14px] py-4">
                        {row.buy > 0 ? (
                          <span className="text-foreground">{Math.abs(row.buy).toFixed(2)}</span>
                        ) : row.sell > 0 ? (
                          <span className="text-rose-600">{Math.abs(row.sell).toFixed(2)}</span>
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