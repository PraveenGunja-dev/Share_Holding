import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  badge?: string;
  trend?: 'up' | 'down';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Strategic Overview',
    items: [
      { id: 'institutional', label: 'Institutional Holders' },
    ]
  },
  {
    title: 'Portfolio Flow',
    items: [
      { id: 'buyers', label: 'Buyers' },
      { id: 'sellers', label: 'Sellers' },
      { id: 'entries', label: 'New Entries/Exits' },
    ]
  },
  {
    title: 'Market Intelligence',
    items: [
      { id: 'fiis', label: 'FIIs & FPIs' },
      { id: 'mutualfunds', label: 'Mutual Funds' },
      { id: 'insurance', label: 'Insurance & PFs' },
      { id: 'aifs', label: 'AIFs' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { id: 'reports', label: 'Reports' },
    ]
  }
];

function TrendSparkline({ type }: { type: 'up' | 'down' }) {
  return (
    <svg width="32" height="12" viewBox="0 0 32 12" className="ml-auto opacity-60">
      <path
        d={type === 'up' ? "M0 10 L8 7 L16 8 L24 3 L32 2" : "M0 2 L8 5 L16 4 L24 9 L32 10"}
        fill="none"
        stroke={type === 'up' ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <div className="w-[210px] flex flex-col border-r border-slate-200/60 dark:border-slate-800 h-full relative z-40 bg-white dark:bg-slate-950 font-['Adani'] transition-colors duration-300">
      <ScrollArea className="flex-1">
        <div className="py-4">
          {navigationGroups.map((group, groupIdx) => (
            <div key={group.title} className={cn("mb-6", groupIdx === 0 ? "mt-1" : "")}>
              <h2 className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-400">
                {group.title}
              </h2>
              <nav className="px-2.5 space-y-1">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center px-3 py-2 rounded-lg transition-all duration-300 group relative",
                        isActive
                          ? "text-[#00205B] dark:text-sky-400 font-bold bg-[#00205B]/[0.06] dark:bg-sky-400/10 shadow-[inset_0_0_0_1px_rgba(0,32,91,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]"
                          : "text-slate-800 dark:text-slate-300 hover:text-[#00205B] dark:hover:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#00205B] dark:bg-sky-500 rounded-r-full shadow-[1px_0_4px_rgba(0,32,91,0.2)] dark:shadow-[1px_0_4px_rgba(56,189,248,0.4)]" />
                      )}

                      <span className={cn(
                        "text-[12px] 2xl:text-[14px] tracking-tight transition-transform duration-300",
                        "whitespace-nowrap overflow-hidden text-ellipsis",
                        isActive ? "translate-x-1" : "group-hover:translate-x-1"
                      )}>
                        {item.label}
                      </span>

                      {item.badge && (
                        <span className={cn(
                          "ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md",
                          item.badge.startsWith('+') ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400"
                        )}>
                          {item.badge}
                        </span>
                      )}

                      {item.trend && (
                        <TrendSparkline type={item.trend as 'up' | 'down'} />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}