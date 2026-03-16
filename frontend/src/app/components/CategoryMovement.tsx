import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { kpiData, categoryMovementData } from '../data';
import { cn } from './ui/utils';

interface CategoryMovementProps {
  selectedCategories: string[];
  metricView: string;
  dateRange: string;
}

export function CategoryMovement({ selectedCategories, metricView, dateRange }: CategoryMovementProps) {
  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-emerald-600" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-rose-600" />;
    return <TrendingUp className="w-4 h-4 text-slate-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-emerald-600';
    if (change < 0) return 'text-rose-600';
    return 'text-slate-600';
  };

  const filteredKPIs = kpiData.filter(kpi =>
    !kpi.category || selectedCategories.length === 0 || selectedCategories.includes(kpi.category)
  ).slice(0, 4);

  const filteredTableData = categoryMovementData.filter(item =>
    selectedCategories.length === 0 || selectedCategories.includes(item.category)
  );

  const chartData = filteredTableData.map(item => ({
    category: item.category,
    week1: item.percent19,
    week2: item.percent26,
    holdings1: item.holding19,
    holdings2: item.holding26
  }));

  const isHoldingsView = metricView === 'holdings';

  const hasData = dateRange === '19-Jan-26 vs 26-Jan-26' || dateRange === 'latest'; // Temporary mapping for sample data
  
  if (!hasData) {
    return (
      <div id="category" className="space-y-6">
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-[#00205B]">Category Movement Unavailable</h3>
          <p className="text-slate-400 text-sm mt-1">Data for the selected period is not currently in the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="category" className="space-y-6 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-4 gap-4">
        <div>
          <h2 className="text-xl 2xl:text-3xl font-black text-primary dark:text-sky-400 tracking-tight">Category-wise Shareholder Movement</h2>
          <p className="text-[12px] 2xl:text-[14px] text-muted-foreground font-bold tracking-widest uppercase mt-1 opacity-80">
            Comparison Between <span className="text-primary dark:text-sky-300">19-Dec-25</span> and <span className="text-primary dark:text-sky-300">26-Dec-25</span>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredKPIs.map((kpi, index) => (
          <Card key={index} className="px-6 py-5 bg-card border-border shadow-lg hover:shadow-2xl transition-all duration-300 group relative overflow-hidden border-l-4 border-l-primary dark:border-l-sky-500">
            <div className="text-[10px] 2xl:text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-2 leading-none">{kpi.label}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl 2xl:text-4xl font-black text-primary dark:text-sky-400 tracking-tighter leading-none">{kpi.value}</div>
            </div>
            <div className={cn("text-[11px] 2xl:text-[13px] font-bold mt-2 flex items-center gap-1.5",
              kpi.change?.startsWith('+') ? 'text-emerald-500' : kpi.change?.startsWith('-') ? 'text-rose-500' : 'text-muted-foreground')}>
              {kpi.change?.startsWith('+') ? <ArrowUp className="w-3 h-3" /> : kpi.change?.startsWith('-') ? <ArrowDown className="w-3 h-3" /> : null}
              {kpi.change}
            </div>
          </Card>
        ))}
      </div>

      {/* Holdings Comparison Chart */}
      <Card className="p-8 bg-card border-border shadow-xl">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-lg 2xl:text-2xl font-black text-primary dark:text-sky-300 uppercase tracking-widest opacity-90 border-l-4 border-primary pl-4">
            Holdings Comparison <span className="text-muted-foreground font-bold ml-2">(% Share Capital)</span>
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" horizontal={true} vertical={false} opacity={0.6} />
            <XAxis type="number" tick={{ fontSize: 13, fontWeight: 500, fontFamily: 'inherit', fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis
              dataKey="category"
              type="category"
              width={160}
              tick={{ fontSize: 13, fontWeight: 500, fontFamily: 'inherit', fill: 'var(--foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              itemStyle={{ color: 'var(--card-foreground)', fontSize: '13px', fontWeight: 500 }}
              labelStyle={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase' }}
              formatter={(value: any) => [isHoldingsView ? `${value.toLocaleString()} Lakhs` : `${value}%`, 'Holding']}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              height={50}
              iconType="circle"
              wrapperStyle={{ paddingTop: '40px' }}
              formatter={(value) => (
                <span className="text-[12px] 2xl:text-[14px] font-bold text-primary dark:text-sky-400 uppercase tracking-widest">{value}</span>
              )}
            />
            <Bar
              dataKey={isHoldingsView ? 'holdings1' : 'week1'}
              name="19-Dec-25"
              fill="#3b82f6"
              radius={[0, 8, 8, 0]}
              barSize={20}
            />
            <Bar
              dataKey={isHoldingsView ? 'holdings2' : 'week2'}
              name="26-Dec-25"
              fill="#22c55e"
              radius={[0, 8, 8, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Movement Data Table */}
      <Card className="p-8 bg-card border-border shadow-xl">
        <h3 className="text-lg 2xl:text-2xl font-black text-primary dark:text-sky-300 mb-8 uppercase tracking-widest opacity-90 border-l-4 border-emerald-500 pl-4">Detailed Movement Data</h3>
        <div className="border border-border rounded-xl overflow-hidden shadow-2xl bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary dark:bg-slate-900">
                <TableRow className="hover:bg-transparent border-b border-white/10">
                  <TableHead className="w-16 font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white text-center py-5">#</TableHead>
                  <TableHead className="font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white py-5 min-w-[200px]">Category</TableHead>
                  <TableHead className="text-right font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white py-5">Holdings (Dec-19)</TableHead>
                  <TableHead className="text-right font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white py-5">% of Share Capital (19)</TableHead>
                  <TableHead className="text-right font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white py-5">Holdings (Dec-26)</TableHead>
                  <TableHead className="text-right font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white py-5">% of Share Capital (26)</TableHead>
                  <TableHead className="text-right font-bold text-[10px] 2xl:text-[12px] uppercase tracking-wider text-white py-5">Change in Holding (L)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTableData.map((item, index) => (
                  <TableRow key={item.category} className="hover:bg-primary/5 transition-colors border-b border-border last:border-0 group">
                    <TableCell className="text-center font-black text-muted-foreground text-[12px] 2xl:text-[14px] py-4">{index + 1}</TableCell>
                    <TableCell className="font-bold text-[13px] 2xl:text-[15px] text-primary dark:text-sky-300 py-4">{item.category}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[12px] 2xl:text-[14px] text-muted-foreground py-4">{item.holding19.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[12px] 2xl:text-[14px] text-muted-foreground py-4 border-r border-border/50">{item.percent19.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[13px] 2xl:text-[15px] text-primary dark:text-foreground py-4 bg-primary/5 dark:bg-sky-400/5">{item.holding26.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-[13px] 2xl:text-[15px] text-primary dark:text-sky-400 py-4 bg-primary/5 dark:bg-sky-400/5 border-r border-border/50">{item.percent26.toFixed(2)}%</TableCell>
                    <TableCell className="text-right py-4">
                      <div className={cn("flex items-center justify-end gap-1.5 font-mono font-black text-[12px] 2xl:text-[14px] px-3 py-1 rounded-md",
                        item.change > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          item.change < 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-muted/30 text-muted-foreground")}>
                        {getChangeIcon(item.change)}
                        {item.change > 0 ? '+' : ''}{item.change.toLocaleString()}
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