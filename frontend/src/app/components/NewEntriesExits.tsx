import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { UserPlus, UserMinus } from 'lucide-react';
import { getEntries, getExits } from '../services/api';
import { useEffect, useState } from 'react';
import { formatDateRange, formatName } from "./ui/utils";
import { getCategoryColor } from '../constants/colors';

interface NewEntriesExitsProps {
  selectedCategories: string[];
  dateRange: string;
  buId?: number;
}


export function NewEntriesExits({ selectedCategories, dateRange, buId }: NewEntriesExitsProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [exits, setExits] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [entriesRaw, exitsRaw] = await Promise.all([
          getEntries(buId, dateRange),
          getExits(buId, dateRange)
        ]);

        const mapAndDedup = (rawData: any[], nameKey: string, shareKey: string) => {
          if (!rawData) return [];
          const aggregated: Record<string, any> = {};

          rawData.forEach((item: any) => {
            const name = (item[nameKey] || item["Institution"] || item["Name of Holder"] || "").trim();
            if (!name || name === "Unknown") return;

            const shares = parseFloat(item[shareKey]) || 0;
            const percent = parseFloat(item["% of Share Capital"]) || 0;

            if (!aggregated[name]) {
              const subCat = (item["Sub Category"] || "").trim();
              const mainCat = (item["Category"] || "").trim();
              const catLabel = (item["Category Label"] || "").trim();
              let uiCat = catLabel || subCat || mainCat || "Others";

              aggregated[name] = {
                category: uiCat,
                shareholder: name,
                shares: 0,
                percent: 0
              };
            }

            aggregated[name].shares += shares;
            aggregated[name].percent = Math.max(aggregated[name].percent, percent);
          });

          return Object.values(aggregated);
        };

        setEntries(mapAndDedup(entriesRaw, "New Shareholder", "Shares Acquired during the Week"));
        setExits(mapAndDedup(exitsRaw, "Exited Shareholder", "Shares Sold during the Week"));
      } catch (e) {
        console.error("Entries/Exits fetch failed:", e);
      }
    }
    fetchData();
  }, [dateRange, buId]);

  const filteredNewEntries = entries.filter(entry => selectedCategories.length === 0 || selectedCategories.includes(entry.category));
  const filteredExits = exits.filter(exit => selectedCategories.length === 0 || selectedCategories.includes(exit.category));

  const totalNewInvestment = filteredNewEntries.reduce((a, c) => a + (c.shares || 0), 0);
  const totalExitAmount = filteredExits.reduce((a, c) => a + (c.shares || 0), 0);


  return (
    <div id="entries" className="space-y-4 transition-all duration-300">
      <div className="border-b border-border pb-2 mb-3">
        <h2 className="text-xl 2xl:text-2xl font-[1000] font-['Adani'] text-primary dark:text-sky-400 tracking-tighter leading-none mb-0.5 inline-block">New Entries / Exits</h2>
        <p className="text-[10px] 2xl:text-[12px] text-muted-foreground font-bold tracking-widest opacity-80 mt-1">Shareholders who entered or exited during {formatDateRange(dateRange)}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* New Entries */}
        <Card className="p-0 bg-card shadow-xl overflow-hidden border-border flex flex-col hover:shadow-2xl transition-all duration-300">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/10 dark:bg-slate-900/40">
            <div>
              <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-emerald-400 tracking-tight">New Entries</h3>
              <p className="text-[9px] 2xl:text-[10px] font-bold text-muted-foreground tracking-widest mt-0.5">{filteredNewEntries.length} new shareholders recorded</p>
            </div>
          </div>

          <div className="p-3">
            <div className="border border-border rounded-xl shadow-lg bg-card/50 flex flex-col overflow-hidden">
              <div className="flex-1 max-h-[400px] overflow-y-auto custom-scrollbar relative">
                <Table>
                  <TableHeader className="bg-primary dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-white/10 text-white">
                      <TableHead className="w-16 font-bold text-white text-center border-r border-white/5 py-4 text-[13px] font-['Adani']">#</TableHead>
                      <TableHead className="font-bold text-white border-r border-white/5 py-4 text-[13px] font-['Adani']">Category</TableHead>
                      <TableHead className="font-bold text-white border-r border-white/5 py-4 text-[13px] font-['Adani']">Shareholder Name</TableHead>
                      <TableHead className="text-right font-bold text-white border-r border-white/5 py-4 text-[13px] font-['Adani']">Shares (L)</TableHead>
                      <TableHead className="text-right font-bold text-white py-4 text-[13px] font-['Adani']">% Stake</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNewEntries.map((entry, idx) => (
                      <TableRow key={idx} className="hover:bg-emerald-500/5 dark:hover:bg-emerald-400/5 border-b border-border last:border-0 transition-colors">
                        <TableCell className="text-center font-black text-muted-foreground text-[13px] font-['Adani'] border-r border-border py-2">{idx + 1}</TableCell>
                        <TableCell className="py-2 border-r border-border">
                          <Badge variant="outline" className="text-[10px] font-bold border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5">
                            {entry.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-[13px] font-['Adani'] text-primary dark:text-sky-300 border-r border-border whitespace-normal break-words leading-tight py-2">{formatName(entry.shareholder)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-[13px] font-['Adani'] text-foreground border-r border-border py-2">{entry.shares.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-[13px] font-['Adani'] text-foreground py-2">{entry.percent.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Total at bottom */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border flex justify-between items-center mt-auto">
            <span className="text-[10px] 2xl:text-[11px] font-black tracking-widest text-muted-foreground">Total new investment</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base 2xl:text-lg font-black text-primary dark:text-sky-400">{totalNewInvestment.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-muted-foreground opacity-70">Lakhs</span>
            </div>
          </div>
        </Card>

        {/* Exits */}
        <Card className="p-0 bg-card shadow-xl overflow-hidden border-border flex flex-col hover:shadow-2xl transition-all duration-300">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/10 dark:bg-slate-900/40">
            <div>
              <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-400 tracking-tight">Exits</h3>
              <p className="text-[9px] 2xl:text-[10px] font-bold text-muted-foreground tracking-widest mt-0.5">{filteredExits.length} shareholders exited</p>
            </div>
          </div>

          <div className="p-3">
            <div className="border border-border rounded-xl shadow-lg bg-card/50 flex flex-col overflow-hidden">
              <div className="flex-1 max-h-[400px] overflow-y-auto custom-scrollbar relative">
                <Table>
                  <TableHeader className="bg-primary dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b border-white/10 text-white">
                      <TableHead className="w-16 font-bold text-white text-center border-r border-white/5 py-4 text-[13px] font-['Adani']">#</TableHead>
                      <TableHead className="font-bold text-white border-r border-white/5 py-4 text-[13px] font-['Adani']">Category</TableHead>
                      <TableHead className="font-bold text-white border-r border-white/5 py-4 text-[13px] font-['Adani']">Shareholder Name</TableHead>
                      <TableHead className="text-right font-bold text-white border-r border-white/5 py-4 text-[13px] font-['Adani']">Shares (L)</TableHead>
                      <TableHead className="text-right font-bold text-white py-4 text-[13px] font-['Adani']">% Stake</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExits.map((exit, idx) => (
                      <TableRow key={idx} className="hover:bg-sky-500/5 dark:hover:bg-sky-400/5 border-b border-border last:border-0 transition-colors">
                        <TableCell className="text-center font-black text-muted-foreground text-[13px] font-['Adani'] border-r border-border py-2">{idx + 1}</TableCell>
                        <TableCell className="py-2 border-r border-border">
                          <Badge variant="outline" className="text-[10px] font-bold border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5">
                            {exit.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-[13px] font-['Adani'] text-primary dark:text-sky-300 border-r border-border whitespace-normal break-words leading-tight py-2">{formatName(exit.shareholder)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-[13px] font-['Adani'] text-foreground border-r border-border py-2">{exit.shares.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-[13px] font-['Adani'] text-foreground py-2">{exit.percent.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Total at bottom */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border flex justify-between items-center mt-auto">
            <span className="text-[10px] 2xl:text-[11px] font-black tracking-widest text-muted-foreground">Total exit liquidation</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base 2xl:text-lg font-black text-primary dark:text-sky-400">{totalExitAmount.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-muted-foreground opacity-70">Lakhs</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}