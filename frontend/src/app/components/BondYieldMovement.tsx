import { cn } from './ui/utils';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowUp, ArrowDown } from 'lucide-react';

const bondData: any[] = [];

interface BondYieldProps {
  dateRange: string;
}

export function BondYieldMovement({ dateRange }: BondYieldProps) {
  const avgYTM = bondData.length > 0 ? bondData.reduce((a, b) => a + b.currentYTM, 0) / bondData.length : 0;
  const avgGSpread = bondData.length > 0 ? Math.round(bondData.reduce((a, b) => a + b.gSpread, 0) / bondData.length) : 0;
  const avgZSpread = bondData.length > 0 ? Math.round(bondData.reduce((a, b) => a + b.zSpread, 0) / bondData.length) : 0;
  const totalOutstanding = bondData.reduce((a, b) => a + (b.issueSize || 0), 0);

  const hasData = false; // Placeholder until bond data is connected to DB
  if (!hasData) {
    return (
      <div id="yield" className="space-y-6">
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mb-4">
            <ArrowUp className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-[#00205B]">No Bond Yield Data</h3>
          <p className="text-slate-400 text-sm mt-1">Movement reports for these dates haven't been processed yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="yield" className="space-y-6 transition-all duration-300">
      <div className="border-b border-border pb-3 mb-4">
        <h2 className="text-lg 2xl:text-2xl font-black text-primary dark:text-sky-400 tracking-tight">Bond Yield / Spread Movement</h2>
        <p className="text-[11px] 2xl:text-[13px] text-muted-foreground font-bold tracking-widest uppercase opacity-80 mt-1">YTM, G-Spread, and Z-Spread analysis for AGEL bonds</p>
      </div>

      {/* Bond Cards Grid (3x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {bondData.slice(0, 6).map((bond, index) => (
          <Card key={index} className="p-4 bg-card border-border shadow-lg hover:shadow-2xl transition-all duration-300 group">
            <div className="space-y-4">
              <div>
                <h4 className="text-[13px] 2xl:text-[16px] font-black text-primary dark:text-sky-300 leading-tight mb-2 group-hover:text-sky-500 transition-colors">
                  {bond.particular}
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] 2xl:text-[11px] px-2 py-0.5 rounded-full font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest shadow-sm">
                    {bond.rating}
                  </span>
                  <span className="text-[10px] 2xl:text-[12px] font-bold text-muted-foreground">
                    Maturity: {bond.maturity}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
                <div>
                  <div className="text-[9px] 2xl:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">YTM</div>
                  <div className="text-[13px] 2xl:text-[16px] font-black text-primary dark:text-foreground">{bond.currentYTM.toFixed(2)}%</div>
                  <div className={`flex items-center gap-0.5 text-[10px] 2xl:text-[11px] font-bold mt-1 ${bond.changeYTM > 0 ? 'text-rose-500' : bond.changeYTM < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {bond.changeYTM > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : bond.changeYTM < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : null}
                    {bond.changeYTM > 0 ? '+' : ''}{bond.changeYTM.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-[9px] 2xl:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">G-Spread</div>
                  <div className="text-[13px] 2xl:text-[16px] font-black text-primary dark:text-foreground">{bond.gSpread} <span className="text-[9px] text-muted-foreground">bps</span></div>
                  <div className={`flex items-center gap-0.5 text-[10px] 2xl:text-[11px] font-bold mt-1 ${bond.changeGSpread > 0 ? 'text-rose-500' : bond.changeGSpread < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {bond.changeGSpread > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : bond.changeGSpread < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : null}
                    {bond.changeGSpread > 0 ? '+' : ''}{bond.changeGSpread}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] 2xl:text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Z-Spread</div>
                  <div className="text-[13px] 2xl:text-[16px] font-black text-primary dark:text-foreground">{bond.zSpread} <span className="text-[9px] text-muted-foreground">bps</span></div>
                  <div className={`flex items-center gap-0.5 text-[10px] 2xl:text-[11px] font-bold mt-1 ${bond.changeZSpread > 0 ? 'text-rose-500' : bond.changeZSpread < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {bond.changeZSpread > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : bond.changeZSpread < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : null}
                    {bond.changeZSpread > 0 ? '+' : ''}{bond.changeZSpread}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="px-5 py-4 bg-card border-border border-l-4 border-l-amber-500 shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Average YTM</div>
          <div className="text-xl 2xl:text-2xl font-black text-primary dark:text-foreground leading-none">{avgYTM.toFixed(2)}%</div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-amber-500 mt-1.5 opacity-80">+0.07% WoW</div>
        </Card>
        <Card className="px-5 py-4 bg-card border-border border-l-4 border-l-sky-500 shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-sky-500 uppercase tracking-widest mb-1.5">Average G-Spread</div>
          <div className="text-xl 2xl:text-2xl font-black text-primary dark:text-foreground leading-none">{avgGSpread} <span className="text-xs 2xl:text-base font-bold text-muted-foreground">bps</span></div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-rose-500 mt-1.5 opacity-80">+3 bps WoW</div>
        </Card>
        <Card className="px-5 py-4 bg-card border-border border-l-4 border-l-emerald-500 shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Average Z-Spread</div>
          <div className="text-xl 2xl:text-2xl font-black text-primary dark:text-foreground leading-none">{avgZSpread} <span className="text-xs 2xl:text-base font-bold text-muted-foreground">bps</span></div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-emerald-500 mt-1.5 opacity-80">+1 bps WoW</div>
        </Card>
        <Card className="px-5 py-4 bg-card border-border border-l-4 border-l-primary dark:border-l-sky-400 shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-primary dark:text-sky-400 uppercase tracking-widest mb-1.5">Total Outstanding</div>
          <div className="text-xl 2xl:text-2xl font-black text-primary dark:text-foreground leading-none">₹{totalOutstanding.toLocaleString()} <span className="text-xs 2xl:text-base font-bold text-muted-foreground">Cr</span></div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-muted-foreground mt-1.5 opacity-80">Issue Size</div>
        </Card>
      </div>

      {/* Detailed Bond Information Table */}
      <Card className="p-4 2xl:p-6 bg-card shadow-2xl border-border">
        <h3 className="text-base 2xl:text-xl font-black text-primary dark:text-sky-400 mb-6 uppercase tracking-widest opacity-90 border-l-4 border-primary dark:border-sky-500 pl-3">Detailed Bond Information</h3>
        <div className="border border-border rounded-xl overflow-hidden shadow-xl bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary dark:bg-slate-900">
                <TableRow className="hover:bg-transparent border-b border-white/10">
                  <TableHead className="text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Issue Date</TableHead>
                  <TableHead className="text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Particular</TableHead>
                  <TableHead className="text-center text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Rating</TableHead>
                  <TableHead className="text-right text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Issue Size (Cr)</TableHead>
                  <TableHead className="text-right text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Coupon</TableHead>
                  <TableHead className="text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Maturity</TableHead>
                  <TableHead className="text-right text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Current YTM</TableHead>
                  <TableHead className="text-right text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">G-Spread</TableHead>
                  <TableHead className="text-right text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Z-Spread</TableHead>
                  <TableHead className="text-right text-[9px] 2xl:text-[11px] font-bold text-white uppercase tracking-widest py-4">Movement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bondData.map((bond, index) => (
                  <TableRow key={index} className="border-b border-border last:border-0 hover:bg-primary/5 transition-colors">
                    <TableCell className="py-3 text-[12px] 2xl:text-[14px] font-bold text-primary dark:text-sky-300">{bond.issueDate || '-'}</TableCell>
                    <TableCell className="py-3 text-[12px] 2xl:text-[14px] font-bold text-primary dark:text-sky-300">{bond.particular}</TableCell>
                    <TableCell className="py-3 text-center">
                      <span className="text-[9px] 2xl:text-[11px] px-2 py-0.5 rounded-full font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{bond.rating}</span>
                    </TableCell>
                    <TableCell className="text-right py-3 font-mono font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-foreground">₹{bond.issueSize?.toLocaleString()}</TableCell>
                    <TableCell className="text-right py-3 font-mono font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-sky-400">{bond.coupon?.toFixed(2)}%</TableCell>
                    <TableCell className="py-3 text-[12px] 2xl:text-[14px] text-muted-foreground font-bold">{bond.maturity}</TableCell>
                    <TableCell className="text-right py-3 font-mono font-bold text-[12px] 2xl:text-[14px] text-primary dark:text-foreground">{bond.currentYTM?.toFixed(2)}%</TableCell>
                    <TableCell className="text-right py-3 font-mono font-bold text-[12px] 2xl:text-[14px] text-muted-foreground">{bond.gSpread}</TableCell>
                    <TableCell className="text-right py-3 font-mono font-bold text-[12px] 2xl:text-[14px] text-muted-foreground">{bond.zSpread}</TableCell>
                    <TableCell className="text-right py-3">
                      <div className={cn("flex items-center justify-end gap-1.5 font-mono font-black text-[10px] 2xl:text-[12px] px-2 py-0.5 rounded-md",
                        bond.changeYTM > 0 ? "bg-rose-500/10 text-rose-500" :
                          bond.changeYTM < 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/30 text-muted-foreground")}>
                        {bond.changeYTM > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : bond.changeYTM < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : null}
                        {bond.changeYTM > 0 ? '+' : ''}{bond.changeYTM?.toFixed(2)}%
                      </div>
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