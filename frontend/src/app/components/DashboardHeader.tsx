import { ChevronRight, LogOut, Home, Sun, Moon, Filter, Settings2, CheckCircle2, Calendar as LucideCalendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import logoImage from '../../../public/assets/logo.webp';
import { useEffect, useState, useMemo } from 'react';
import { Calendar } from './ui/calendar';
import { format, parse, isWithinInterval, startOfDay } from 'date-fns';
import {
  getInstitutionalHolders,
  getTopBuyers,
  getTopSellers,
  getFIIHolders,
  getActiveMFHolders,
  getPassiveMFHolders,
  getInsurancePFHolders,
  getAIFHolders,
  getDateRanges
} from '../services/api';
import { getCategoryColor } from '../constants/colors';

interface DashboardHeaderProps {
  selectedBU?: string;
  selectedBUId?: number;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  availableCategories: string[];
  onAvailableCategoriesChange: (categories: string[]) => void;
  topN: number;
  onTopNChange: (value: number) => void;
  metricView: string;
  onMetricViewChange: (value: string) => void;
  mfView: string;
  onMfViewChange: (value: string) => void;
  onHomeClick: () => void;
}

const fullCategories = [
  'Promoter',
  'FII',
  'FPI',
  'Mutual Funds',
  'Insurance Companies',
  'Provident Funds',
  'AIFs',
  'Financial Institutions',
  'NBFCs',
  'PMS',
  'Sovereign Wealth Funds',
  'Non-Institution',
  'Retail',
  'Bodies Corporate'
];

const restrictedCategories = [
  'Promoter',
  'Mutual Funds',
  'FII',
  'Insurance Companies',
  'AIFs'
];

export function DashboardHeader({
  selectedBU,
  selectedBUId,
  dateRange,
  onDateRangeChange,
  selectedCategories,
  onCategoriesChange,
  availableCategories,
  onAvailableCategoriesChange,
  topN,
  onTopNChange,
  metricView,
  onMetricViewChange,
  mfView,
  onMfViewChange,
  onHomeClick
}: DashboardHeaderProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dbWeeks, setDbWeeks] = useState<{ label: string, value: string }[]>([]);

  useEffect(() => {
    async function loadDataFromDB() {
      if (!selectedBUId) return;
      try {
        const [inst, buyers, sellers, fiis, mfsActive, mfsPassive, insurance, aifs, availableDates] = await Promise.all([
          getInstitutionalHolders(selectedBUId, dateRange).catch(() => []),
          getTopBuyers(selectedBUId, dateRange).catch(() => []),
          getTopSellers(selectedBUId, dateRange).catch(() => []),
          getFIIHolders(selectedBUId, dateRange).catch(() => []),
          getActiveMFHolders(selectedBUId, dateRange).catch(() => []),
          getPassiveMFHolders(selectedBUId, dateRange).catch(() => []),
          getInsurancePFHolders(selectedBUId, dateRange).catch(() => []),
          getAIFHolders(selectedBUId, dateRange).catch(() => []),
          getDateRanges(selectedBUId).catch(() => []),
        ]);

        // Populate Date Dropdown
        if (availableDates && Array.isArray(availableDates) && availableDates.length > 0) {
          const formattedWeeks = availableDates
            .filter(Boolean)
            .sort((a: string, b: string) => {
              const parseDR = (dr: string) => {
                try {
                  const parts = dr.split(' vs ');
                  const target = parts.length > 1 ? parts[1] : parts[0];
                  const [day, mon, yr] = target.split('-');
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const m = months.indexOf(mon);
                  return new Date(2000 + parseInt(yr), m, parseInt(day)).getTime();
                } catch (e) { return 0; }
              };
              return parseDR(b) - parseDR(a);
            })
            .map((dr: string) => ({ label: dr, value: dr }));

          setDbWeeks(formattedWeeks);

          // Default to latest if not set
          if (!dateRange && formattedWeeks.length > 0) {
            onDateRangeChange(formattedWeeks[0].value);
          }
        }

        const allRaw = [...inst, ...buyers, ...sellers, ...fiis, ...mfsActive, ...mfsPassive, ...insurance, ...aifs];

        const foundCats = new Set<string>();
        allRaw.forEach((item: any) => {
          const uiCategory = (item["Category Label"] || item["Sub Category"] || item["Category"] || "").trim();
          if (uiCategory) foundCats.add(uiCategory);
        });

        const combinedCats = Array.from(foundCats);

        const sortedCats = combinedCats.sort((a, b) => {
          const idxA = fullCategories.indexOf(a), idxB = fullCategories.indexOf(b);
          if (idxA === -1 && idxB === -1) return a.localeCompare(b);
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });

        onAvailableCategoriesChange(sortedCats);
      } catch (e) { console.error("Failed to load DB data:", e); }
    }
    loadDataFromDB();
  }, [selectedBUId, dateRange]);

  const parsedIntervals = useMemo(() => {
    return dbWeeks.map(w => {
      if (!w.value || !w.value.includes(' vs ')) return null;
      try {
        const [startStr, endStr] = w.value.split(' vs ');
        return {
          start: startOfDay(parse(startStr, 'dd-MMM-yy', new Date())),
          end: startOfDay(parse(endStr, 'dd-MMM-yy', new Date())),
          original: w.value
        };
      } catch (e) { return null; }
    }).filter((x): x is {start: Date, end: Date, original: string} => x !== null);
  }, [dbWeeks]);

  const selectedInterval = useMemo(() => {
    return parsedIntervals.find(i => i.original === dateRange);
  }, [parsedIntervals, dateRange]);

  const onCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    const selected = startOfDay(date);
    const match = parsedIntervals.find(i => isWithinInterval(selected, { start: i.start, end: i.end }));

    if (match) {
      onDateRangeChange(match.original);
    } else {
      alert(`No reporting period found for ${format(date, 'PPP')}. Please select a date within an available range.`);
    }
  };

  const activeList = useMemo(() => {
    return availableCategories || [];
  }, [availableCategories]);

  const [searchQuery, setSearchQuery] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (!popoverOpen) setSearchQuery('');
  }, [popoverOpen]);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const filteredList = useMemo(() =>
    activeList.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase())),
    [activeList, searchQuery]
  );

  return (
    <div className="sticky top-0 z-50 flex flex-col bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.05)] transition-all duration-300 font-sans border-b border-gray-100 dark:border-slate-800/60">
      {/* Row 1 - Brand & Global Actions */}
      <div className="w-full px-6 h-16 flex items-center justify-center border-b border-gray-100 dark:border-slate-800/60">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Adani" className="h-[40px] w-auto object-contain cursor-pointer transition-transform hover:scale-105" onClick={onHomeClick} />
            <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-1" />
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-[#00205B] dark:text-gray-100 tracking-tight leading-none">
                {selectedBU || 'Adani Green Energy Limited'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                    <LucideCalendar className="w-4 h-4 text-sky-500" strokeWidth={2.5} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar 
                    mode="single"
                    selected={selectedInterval?.start}
                    onSelect={onCalendarSelect}
                    initialFocus
                    className="rounded-md border shadow"
                    modifiers={{
                      selectedRange: selectedInterval ? { from: selectedInterval.start, to: selectedInterval.end } : [],
                      availableRange: parsedIntervals.map(i => ({ from: i.start, to: i.end }))
                    }}
                    modifiersClassNames={{
                      selectedRange: "bg-[#002B5C] text-white rounded-none first:rounded-l-md last:rounded-r-md !opacity-100",
                      availableRange: "font-black text-[#002B5C] hover:bg-sky-50"
                    }}
                  />
                </PopoverContent>
              </Popover>

              <Select value={dateRange} onValueChange={onDateRangeChange}>
                <SelectTrigger className="h-8 px-3 flex items-center gap-2 bg-gray-50 dark:bg-slate-900 border-none rounded-full shadow-inner text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 focus:ring-0 w-auto min-w-[200px] transition-colors">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 dark:border-slate-800 shadow-xl">
                  {dbWeeks.map(w => {
                    const label = w.label.includes(' vs ') ? w.label.replace(' vs ', ' to ') : w.label;
                    return <SelectItem key={w.value} value={w.value} className="text-xs">{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                {theme === 'light' ? <Moon className="w-4 h-4 text-gray-500" /> : <Sun className="w-4 h-4 text-yellow-500" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { logout(); window.location.reload(); }} className="w-8 h-8 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 text-gray-400 hover:text-rose-600 transition-all">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 - Unified Control Center */}
      <div className="w-full h-12 flex items-center justify-end bg-gray-50/50 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-800/40">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-1 rounded-md border border-gray-200 dark:border-slate-700/60 shadow-sm transition-all hover:shadow-md">
          {/* View Selection */}
          <div className="flex items-center gap-2 pl-3">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">View</span>
            <Select value={metricView} onValueChange={onMetricViewChange}>
              <SelectTrigger className="h-7 border-none bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md px-2 text-[12px] font-bold text-sky-600 dark:text-sky-400 w-[140px] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 dark:border-slate-800 shadow-xl">
                <SelectItem value="all" className="text-xs">All Metrics</SelectItem>
                <SelectItem value="holdings" className="text-xs">Total Holdings</SelectItem>
                <SelectItem value="percentage" className="text-xs">% Share Capital</SelectItem>
                <SelectItem value="change" className="text-xs">Velocity (Change)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1" />

          {/* Top Holders */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">Top</span>
            <Select value={topN.toString()} onValueChange={(v) => onTopNChange(Number(v))}>
              <SelectTrigger className="h-7 border-none bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md px-2 text-[12px] font-bold text-sky-600 dark:text-sky-400 w-[60px] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 dark:border-slate-800 shadow-xl">
                {[5, 10, 15, 20, 30, 50].map(n => <SelectItem key={n} value={n.toString()} className="text-xs">{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1" />

          {/* Categories Popover */}
          <div className="flex items-center gap-2 pr-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">Breakdown</span>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="h-7 flex items-center gap-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <Filter className="w-3 h-3 text-sky-500" />
                  <span className="text-[12px] font-bold text-sky-600 dark:text-sky-400">
                    {selectedCategories.length === 0 || selectedCategories.length === activeList.length
                      ? 'All Categories'
                      : `${selectedCategories.length} Selected`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0 rounded-xl overflow-hidden border-gray-100 dark:border-slate-800 shadow-2xl" align="center">
                <div className="p-3 bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Select Categories</span>
                    {(selectedCategories.length > 0) && (
                      <button
                        onClick={() => onCategoriesChange([])}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400"
                      >
                        Reset All
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5">
                  <div
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer rounded-lg transition-colors group"
                    onClick={() => onCategoriesChange([])}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${selectedCategories.length === 0 ? 'bg-sky-600 border-sky-600' : 'border-gray-300 dark:border-slate-600'}`}>
                      {selectedCategories.length === 0 && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-[13px] font-medium ${selectedCategories.length === 0 ? 'text-sky-600 dark:text-sky-400' : 'text-gray-600 dark:text-gray-300'}`}>All Categories</span>
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-slate-800 my-1 mx-2" />
                  {activeList.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    const catColor = getCategoryColor(cat);
                    return (
                      <div
                        key={cat}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer rounded-lg transition-colors group"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(cat);
                        }}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-sky-600 border-sky-600' : 'border-gray-300 dark:border-slate-600'}`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                        <span className={`text-[13px] font-medium transition-colors ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-gray-600 dark:text-gray-300'}`}>{cat}</span>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHeader;