  import { Card } from './ui/card';
  import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Label,
    LabelList, PieChart, Pie, Legend, ReferenceLine
  } from 'recharts';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
  import { Badge } from './ui/badge';
  import { ArrowUp, ArrowDown, Info } from 'lucide-react';
  import { Button } from './ui/button';
  import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
  } from './ui/sheet';
  import { getInstitutionalHolders } from '../services/api';
  import { useEffect, useState, useMemo, useRef } from 'react';
  import { cn, formatDateRange , formatName} from "./ui/utils";
  import { useTheme } from '../context/ThemeContext';
  import { getCategoryColor } from '../constants/colors';
  import { RankedInstitutionalBars } from './RankedInstitutionalBars';
  import { getOwnershipMixPieLayout } from './ui/ownershipMixPie';

  interface InstitutionalHoldersProps {
    selectedCategories: string[];
    availableCategories: string[];
    topN: number;
    metricView: string;
    dateRange: string;
    buId?: number;
  }


  export function InstitutionalHolders({
    selectedCategories = [],
    availableCategories = [],
    topN,
    metricView,
    dateRange,
    buId
  }: InstitutionalHoldersProps) {
    const { theme } = useTheme();
    const titleRef = useRef<HTMLHeadingElement | null>(null);
    const subtitleRef = useRef<HTMLParagraphElement | null>(null);
    const [liveData, setLiveData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShareholder, setSelectedShareholder] = useState<any | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const [detectedDates, setDetectedDates] = useState({ latest: '', prev: '' });
    

    useEffect(() => {
      async function fetchData() {
        setLoading(true);
        try {
          const rawData = await getInstitutionalHolders(buId, dateRange);
          if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return;

          const sample = rawData[0];
          const drString = sample["DateRange"] || "";
          
          if (drString.includes(' vs ')) {
            const parts = drString.split(' vs ');
            setDetectedDates({
              latest: parts[1],
              prev: parts[0]
            });
          } else {
            setDetectedDates({
              latest: "Latest",
              prev: "Previous"
            });
          }

          const aggregated: Record<string, any> = {};

          rawData.forEach((item: any) => {
            const name = (item["Institution"] || item["Name of Holder"] || item["Name"] || "").trim();
            if (!name || name === "Unknown") return;

            const rank = item["Rank"] || item["Sr.No"] || 0;
            const subCat = (item["Sub Category"] || "").trim();
            const mainCat = (item["Category"] || "").trim();
            const catLabel = (item["Category Label"] || "").trim();
            let uiCategory = catLabel || subCat || mainCat || "Others";

            const clean = (v: any) => parseFloat(String(v || 0).replace(/[%,]/g, '')) || 0;
            const curVal = clean(item["Current"]);
            const prevVal = clean(item["Previous"]);
            const pCurrent = clean(item["% of Sh. Cap (Current)"] || item["Latest Percent"]);
            const pPrev = clean(item["% of Sh. Cap (Previous)"] || item["Previous Percent"]);
            const buy = clean(item["Buy"] || item["Buy Shares"]);
            const sell = clean(item["Sell"] || item["Sell Shares"]);
            const pointChange = clean(item["Change in % Points"] || item["Change in Holding (pps)"] || item["Point Change"] || item["MoM change in holdings"]);

            if (!aggregated[name]) {
              aggregated[name] = {
                name, category: uiCategory, latestHoldings: curVal, latestPercent: pCurrent,
                prevHoldings: prevVal, prevPercent: pPrev, change: pointChange, buy, sell, rank
              };
            } else {
              aggregated[name].latestHoldings += curVal;
              aggregated[name].latestPercent += pCurrent;
              aggregated[name].prevHoldings += prevVal;
              aggregated[name].prevPercent += pPrev;
              aggregated[name].buy += buy;
              aggregated[name].sell += sell;
              aggregated[name].change += pointChange;
            }
          });

          const finalData = Object.values(aggregated).map(item => ({
            ...item,
            holdings: item.latestHoldings,
            percent: item.latestPercent,
            wowChangeValue: item.change
          }));

          setLiveData(finalData);
        } catch (error) {
          console.error("Failed to fetch holders:", error);
        } finally {
          setLoading(false);
        }
      }
      fetchData();
    }, [dateRange, buId]);

    // ── Safe arrays: guard every derived array against undefined inputs ──────────
    const safeSelectedCategories = Array.isArray(selectedCategories) ? selectedCategories : [];
    const safeAvailableCategories = Array.isArray(availableCategories) ? availableCategories : [];
    const safeLiveData = Array.isArray(liveData) ? liveData : [];

    const filteredData = safeLiveData
      .filter(sh => safeSelectedCategories.length === 0 || safeSelectedCategories.includes(sh.category))
      .slice(0, topN);

    const isHoldingsView = metricView === 'holdings';

    const totalHoldings = filteredData.reduce((acc, curr) => acc + curr.holdings, 0);
    const totalWoWChange = filteredData.reduce((acc, curr) => acc + (curr.holdings - curr.prevHoldings), 0);

    const chartDataRaw = filteredData.map(sh => {
      let activeVal = sh.holdings;
      let label = `${sh.holdings.toLocaleString()}L`;

      if (metricView === 'percentage') {
        activeVal = sh.percent;
        label = `${sh.percent.toFixed(2)}%`;
      } else if (metricView === 'change') {
        activeVal = Math.abs(sh.wowChangeValue);
        label = `${sh.wowChangeValue > 0 ? '+' : ''}${sh.wowChangeValue.toLocaleString()}L`;
      } else if (metricView === 'all') {
        label = `${sh.holdings.toLocaleString()}L\u00A0(${sh.percent.toFixed(2)}%)\u00A0${sh.wowChangeValue > 0 ? '▲' : sh.wowChangeValue < 0 ? '▼' : ''}`.trim();
      }

      return {
        name: sh.name,
        lakhs: sh.holdings,
        percent: sh.percent,
        change: sh.wowChangeValue,
        activeVal: activeVal,
        category: sh.category,
        label: label
      };
    });

    const maxVal = Math.max(...chartDataRaw.map((d: any) => d.activeVal), 1);
    const trackValue = maxVal * (metricView === 'all' ? 1.4 : 1.15);

    const chartData: any[] = chartDataRaw.map((d: any) => ({ ...d, activeValTrack: trackValue }));
    while (chartData.length < topN) {
      chartData.push({
        name: '—',
        activeVal: 0,
        activeValTrack: trackValue,
        lakhs: 0,
        percent: 0,
        category: 'Others',
        label: '—',
        rank: chartData.length + 1
      });
    }

    // Ownership Mix should reflect the selected categories and their distribution
    const donutData = useMemo(() => {
      // If no categories are selected, show everything available
      const categoriesToMap = safeSelectedCategories.length > 0 ? safeSelectedCategories : safeAvailableCategories;
      
      return categoriesToMap.map(cat => ({
        name: cat === 'Alternative Investment Funds' ? 'AIF' : cat === 'Sovereign Wealth Funds' ? 'SWF' : cat,
        // Sum the holdings for this specific category from the full live dataset
        value: safeLiveData
          .filter(d => d.category === cat)
          .reduce((acc, curr) => acc + curr.holdings, 0),
        color: getCategoryColor(cat)
      })).filter(d => d.value > 0);
    }, [safeSelectedCategories, safeAvailableCategories, safeLiveData]);

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
    // Treat smaller laptops (like 13") as tablet so charts fit without clipping.
    const isTablet = dimensions.width < 1400;
    const isUltraWide = dimensions.width >= 1920;

    const chartMargin = isMobile
      ? { left: 40, right: 40, bottom: 40, top: 10 }
      : isTablet
        ? { left: 60, right: 60, bottom: 40, top: 10 }
        : { left: 80, right: 60, bottom: 40, top: 10 };

    const yAxisWidth = isMobile ? 180 : isTablet ? 280 : 380;

    const ownershipMixPie = useMemo(() => getOwnershipMixPieLayout(dimensions.width), [dimensions.width]);

    const chartHeight = Math.max(isUltraWide ? 500 : 440, topN * (isUltraWide ? 32 : 28));

    const barSize = topN > 15
      ? (isUltraWide ? 14 : 12)
      : topN > 10
        ? (isUltraWide ? 20 : 18)
        : (isUltraWide ? 32 : 28);

    const handleBarClick = (data: any) => {
      const shareholder = safeLiveData.find(sh => sh.name === data.name);
      if (shareholder) {
        setSelectedShareholder(shareholder);
        setSheetOpen(true);
      }
    };

    // ── Loading / empty state ─────────────────────────────────────────────────────
    if (loading) {
      return (
        <div id="institutional" className="space-y-4">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-bold animate-pulse">
            Loading institutional holders…
          </div>
        </div>
      );
    }

    if (!loading && filteredData.length === 0) {
      return (
        <div id="institutional" className="space-y-4">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-bold">
            No data available for the selected filters.
          </div>
        </div>
      );
    }

    return (
      <div id="institutional" className="space-y-4 transition-all duration-300">
        <div className="flex items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
          <div>
            <h2 ref={titleRef} className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-1.5 inline-block transition-all">Top {topN} Institutional Holders</h2>
            <p ref={subtitleRef} className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold tracking-tight opacity-80">
              Based on holdings as of {detectedDates.latest || (formatDateRange(dateRange).split(' vs ')[1] || 'Latest Date')}
            </p>
          </div>
          <div className="text-[13px] font-bold text-primary dark:text-sky-300 tracking-widest bg-muted dark:bg-slate-900/50 px-2 py-1 rounded-full border border-border transition-all shadow-sm">
            Comparing {detectedDates.latest && detectedDates.prev ? `${detectedDates.prev} vs ${detectedDates.latest}` : formatDateRange(dateRange)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 max-w-full overflow-hidden">
          <Card className="col-span-12 p-4 bg-card border-border shadow-[0_8px_30px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Ownership Mix ribbon */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 bg-muted/20 dark:bg-slate-900/40 p-2 rounded-xl border border-border/40 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0"
                  style={{ width: ownershipMixPie.boxSizePx, height: ownershipMixPie.boxSizePx }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        innerRadius={ownershipMixPie.innerRadius}
                        outerRadius={ownershipMixPie.outerRadius}
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
                <div className="flex flex-col">
                  <span className="text-[12px] 2xl:text-[14px] font-black text-primary dark:text-sky-400 tracking-[0.15em] uppercase">Ownership Mix</span>
                  <span className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold opacity-60 uppercase">Distribution by category</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pr-2 w-full md:w-auto">
                {donutData.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-[12px] 2xl:text-[14px] font-black text-foreground whitespace-nowrap tracking-tight uppercase">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <RankedInstitutionalBars 
                data={filteredData.map(sh => ({
                  name: sh.name,
                  category: sh.category,
                  lakhs: sh.latestHoldings,
                  percent: sh.latestPercent,
                  change: sh.wowChangeValue
                }))} 
              />
            </div>

          </Card>

          <Card className="col-span-12 p-3 2xl:p-4 bg-card border-border shadow-[0_4px_20px_-4px_rgba(0,32,91,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-wider">Top {topN} Institutional Shareholders</h3>
            </div>

            <div className="border border-border rounded-xl shadow-md flex flex-col bg-card overflow-hidden">
              <div className="flex-1 max-h-[500px] overflow-auto custom-scrollbar relative">
                <Table className="relative">
                  <TableHeader className="bg-primary dark:bg-slate-900 transition-colors sticky top-0 z-30 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-white/10">
                      <TableHead rowSpan={2} className="w-14 text-center text-white font-bold border-r border-white/5 text-[13px] font-['Adani']">Rank</TableHead>
                      <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 text-[13px] font-['Adani']">Shareholder Name</TableHead>
                      <TableHead rowSpan={2} className="text-white font-bold border-r border-white/5 text-[13px] font-['Adani'] w-24">Category</TableHead>
                      <TableHead colSpan={2} className={cn("text-center text-white font-bold border-r border-white/5 transition-colors text-[13px] font-['Adani']", (metricView === 'holdings' || metricView === 'percentage' || metricView === 'all') ? "bg-white/20" : "bg-white/10")}>{detectedDates.latest}</TableHead>
                      <TableHead colSpan={2} className={cn("text-center text-white font-bold border-r border-white/5 transition-colors text-[13px] font-['Adani']", (metricView === 'holdings' || metricView === 'percentage' || metricView === 'all') ? "bg-white/20" : "bg-white/10")}>{detectedDates.prev}</TableHead>
                      <TableHead rowSpan={2} className={cn("text-center text-white font-bold transition-colors text-[13px] font-['Adani']", metricView === 'change' ? "bg-white/20" : "")}>Change in Holding Shares</TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-b border-white/10">
                      <TableHead className={cn("text-center text-white font-bold border-r border-white/5 text-[13px] font-['Adani'] py-1 transition-all", metricView === 'holdings' || metricView === 'all' ? "bg-sky-400/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]" : "")}>Holding</TableHead>
                      <TableHead className={cn("text-center text-white font-bold border-r border-white/5 text-[13px] font-['Adani'] py-1 transition-all", metricView === 'percentage' || metricView === 'all' ? "bg-sky-400/20 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]" : "")}>% of Share Capital</TableHead>
                      <TableHead className="text-center text-white font-bold border-r border-white/5 text-[13px] font-['Adani'] py-1">Holding</TableHead>
                      <TableHead className="text-center text-white font-bold text-[13px] font-['Adani'] py-1">% of Share Capital</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-card">
                    {filteredData.map((row, index) => (
                      <TableRow
                        key={index}
                      className="hover:bg-primary/5 dark:hover:bg-sky-400/5 transition-colors duration-200 border-b border-border last:border-0"
                      >
                        <TableCell className="text-center font-black text-muted-foreground text-[11px] 2xl:text-[13px] border-r border-border py-4 whitespace-normal">
                          {index + 1}
                        </TableCell>
                        <TableCell className="py-2 border-r border-border min-w-[200px] max-w-[300px]">
                        <div className="font-bold text-[13px] font-['Adani'] text-primary dark:text-sky-300 whitespace-normal leading-tight">
                            {formatName(row.name)}
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-border py-2">
                          <div
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black tracking-tighter shadow-sm"
                            style={{ backgroundColor: `${getCategoryColor(row.category)}15`, color: getCategoryColor(row.category) }}
                          >
                            {row.category}
                          </div>
                        </TableCell>

                        {/* Latest Date Data */}
                        <TableCell className={cn(
                          "text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border/50 py-2 transition-colors",
                          (metricView === 'holdings' || metricView === 'all')
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            : "text-foreground"
                        )}>
                          {row.latestHoldings.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border py-2 transition-colors",
                          (metricView === 'percentage' || metricView === 'all')
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            : "text-foreground"
                        )}>
                          {row.latestPercent.toFixed(2)}%
                        </TableCell>

                        {/* Previous Date Data */}
                        <TableCell className={cn(
                          "text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border/50 py-2 transition-colors",
                          (metricView === 'holdings' || metricView === 'all')
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            : "text-foreground"
                        )}>
                          {row.prevHoldings.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center font-mono font-black text-[11px] 2xl:text-[13px] border-r border-border py-2 transition-colors",
                          (metricView === 'percentage' || metricView === 'all')
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            : "text-foreground"
                        )}>
                          {row.prevPercent.toFixed(2)}%
                        </TableCell>

                        <TableCell className={cn(
                          "change-holding-cell text-center font-mono font-black text-[11px] 2xl:text-[11px] py-2 transition-colors",
                          metricView === 'change'
                            ? "bg-sky-500/15"
                            : ""
                        )}>
                          {row.sell > 0 ? (
                            <span className="text-rose-600">{Math.abs(row.sell).toLocaleString()}</span>
                          ) : row.buy > 0 ? (
                            <span className="text-foreground dark:text-white font-black">{Math.abs(row.buy).toLocaleString()}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:w-[540px] border-l-primary border-l-4 bg-card">
            <SheetHeader className="mb-8 border-b border-border pb-6">
              <SheetTitle className="text-2xl font-black text-primary dark:text-sky-400">{selectedShareholder?.name}</SheetTitle>
              <SheetDescription className="font-bold text-[11px] uppercase tracking-widest text-slate-400">Institutional Profile Discovery</SheetDescription>
            </SheetHeader>

            {selectedShareholder && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 dark:bg-slate-900/50 border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Regulatory Category</div>
                    <Badge className="font-bold uppercase tracking-wider" style={{ backgroundColor: getCategoryColor(selectedShareholder.category), color: 'white' }}>
                      {selectedShareholder.category}
                    </Badge>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 dark:bg-slate-900/50 border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Holding Volume</div>
                    <div className="font-black text-xl text-primary dark:text-foreground">{selectedShareholder.holdings.toLocaleString()} <span className="text-xs text-muted-foreground font-bold uppercase">Lakhs</span></div>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 dark:bg-slate-900/50 border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Equity Stake</div>
                    <div className="font-black text-xl text-primary dark:text-foreground">{selectedShareholder.percent.toFixed(2)}% <span className="text-xs text-muted-foreground font-bold uppercase">Total</span></div>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 dark:bg-slate-900/50 border border-border">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Weekly Delta</div>
                    <div className={cn("font-black text-xl flex items-center gap-2", selectedShareholder.change > 0 ? 'text-emerald-500' : selectedShareholder.change < 0 ? 'text-rose-500' : 'text-slate-400')}>
                      {selectedShareholder.change > 0 ? '+' : ''}{selectedShareholder.change.toFixed(2)}%
                      {selectedShareholder.change > 0 ? <ArrowUp /> : selectedShareholder.change < 0 ? <ArrowDown /> : null}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }