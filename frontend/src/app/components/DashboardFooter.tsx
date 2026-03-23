import logoImage from '@/assets/6f29c1a0f289e97c582d0783215dfe3554c97f37.png';

function extractYearFromBuName(buName?: string): number {
  if (!buName) return new Date().getFullYear();

  // Common BU names include a 4-digit year (e.g. "FY 2024-25" / "2024").
  const matches = buName.match(/\b(19|20)\d{2}\b/g);
  if (matches && matches.length > 0) {
    // If multiple years exist (e.g. 2024-25), prefer the first one.
    const year = Number(matches[0]);
    if (Number.isFinite(year)) return year;
  }

  return new Date().getFullYear();
}

export function DashboardFooter({ buName }: { buName?: string }) {
  return (
    <footer className="bg-card dark:bg-[#020617] border-t border-border px-6 py-4 mt-8 transition-colors duration-300">
      <div className="w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="bg-white dark:bg-white/5 border border-border rounded-xl p-2.5 shadow-sm">
              <img src={logoImage} alt="Adani Renewables" className="h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-[13px] text-primary dark:text-sky-300 font-bold">
                Note: All share values are in <span className="font-black text-primary dark:text-sky-400">Lakhs</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-[11px] font-bold text-muted-foreground tracking-widest opacity-80">
              © {extractYearFromBuName(buName)} Adani Green Energy Limited
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
