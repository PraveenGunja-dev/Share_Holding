import { Card } from './ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

const priceVolumeData: any[] = [];

interface SharePriceProps {
  dateRange: string;
}

export function SharePriceMovement({ dateRange }: SharePriceProps) {
  const hasData = false; // Placeholder until price data is connected to DB
  if (!hasData) {
    return (
      <div id="price" className="space-y-6">
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mb-4">
            <LineChart className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-[#00205B]">No Price Movement Data</h3>
          <p className="text-slate-400 text-sm mt-1">Data for the selected period is not currently in the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="price" className="space-y-6 transition-all duration-300">
      <div className="border-b border-border pb-3 mb-4">
        <h2 className="text-xl 2xl:text-2xl font-black font-['Adani'] text-primary dark:text-sky-400 tracking-tight">Weekly Share Price & Volume Movement</h2>
        <p className="text-[11px] 2xl:text-[13px] text-muted-foreground font-bold tracking-widest uppercase opacity-80 mt-1">Price comparison with Nifty 50 and trading volume analysis</p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="px-5 py-4 bg-card border-border border-l-4 border-l-emerald-500 shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Current Price (APL)</div>
          <div className="text-xl 2xl:text-2xl font-black text-primary dark:text-foreground leading-none">₹0</div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-emerald-500 mt-1.5 opacity-80">+0.00% WoW</div>
        </Card>
        <Card className="px-5 py-4 bg-card border-border shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Week High</div>
          <div className="text-lg 2xl:text-xl font-black text-primary dark:text-foreground leading-none">₹0</div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-muted-foreground mt-1.5 opacity-70">26-Dec-25</div>
        </Card>
        <Card className="px-5 py-4 bg-card border-border shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Week Low</div>
          <div className="text-lg 2xl:text-xl font-black text-primary dark:text-foreground leading-none">₹0</div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-muted-foreground mt-1.5 opacity-70">21-Dec-25</div>
        </Card>
        <Card className="px-5 py-4 bg-card border-border shadow-xl">
          <div className="text-[10px] 2xl:text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Avg. % Delivery</div>
          <div className="text-xl 2xl:text-2xl font-black text-primary dark:text-foreground leading-none">0.0%</div>
          <div className="text-[10px] 2xl:text-[11px] font-bold text-muted-foreground mt-1.5 opacity-70">This Week</div>
        </Card>
      </div>

      {/* Price Movement Comparison */}
      <Card className="p-4 2xl:p-6 bg-card shadow-xl border-border">
        <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-300 mb-6 uppercase tracking-widest opacity-90 border-l-4 border-primary pl-4">Price Movement Comparison (APL vs Nifty 50)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={priceVolumeData} margin={{ left: 0, right: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} opacity={0.6} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 900, fontFamily: 'inherit', className: 'font-black', fill: 'var(--foreground)' }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fontWeight: 900, fontFamily: 'inherit', className: 'font-black', fill: '#f43f5e' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'APL Price (₹)', angle: -90, position: 'insideLeft', style: { fontSize: 13, fontWeight: 900, fontFamily: 'inherit', fill: '#f43f5e' }, className: 'font-black' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fontWeight: 900, fontFamily: 'inherit', className: 'font-black', fill: '#14b8a6' }}
              axisLine={false}
              tickLine={false}
              domain={['dataMin - 100', 'dataMax + 100']}
              label={{ value: 'Nifty 50', angle: 90, position: 'insideRight', style: { fontSize: 13, fontWeight: 900, fontFamily: 'inherit', fill: '#14b8a6' }, className: 'font-black' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={50}
              iconType="circle"
              wrapperStyle={{ paddingTop: '30px' }}
              formatter={(value) => (
                <span className="text-[12px] 2xl:text-[14px] font-bold text-primary dark:text-sky-400 uppercase tracking-widest">{value}</span>
              )}
            />
            <Line yAxisId="left" type="monotone" dataKey="aplPrice" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', r: 6, strokeWidth: 3, stroke: 'var(--card)' }} activeDot={{ r: 8, strokeWidth: 0 }} name="APL Price" animationDuration={1500} />
            <Line yAxisId="right" type="monotone" dataKey="niftyPrice" stroke="#14b8a6" strokeWidth={3} dot={{ fill: '#14b8a6', r: 6, strokeWidth: 3, stroke: 'var(--card)' }} activeDot={{ r: 8, strokeWidth: 0 }} name="Nifty 50" animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Trading Volume Analysis */}
      <Card className="p-4 2xl:p-6 bg-card shadow-xl border-border">
        <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-300 mb-6 uppercase tracking-widest opacity-90 border-l-4 border-emerald-500 pl-4">Trading Volume Analysis (Delivery vs Intraday)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={priceVolumeData} margin={{ left: 0, right: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} opacity={0.6} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 900, fontFamily: 'inherit', className: 'font-black', fill: 'var(--foreground)' }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fontWeight: 900, fontFamily: 'inherit', className: 'font-black', fill: 'var(--foreground)' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Volume (Shares)', angle: -90, position: 'insideLeft', style: { fontSize: 13, fontWeight: 900, fontFamily: 'inherit', fill: 'var(--foreground)' }, className: 'font-black' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 12, fontWeight: 900, fontFamily: 'inherit', className: 'font-black', fill: '#14b8a6' }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              label={{ value: '% Delivery', angle: 90, position: 'insideRight', style: { fontSize: 13, fontWeight: 900, fontFamily: 'inherit', fill: '#14b8a6' }, className: 'font-black' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={50}
              iconType="circle"
              wrapperStyle={{ paddingTop: '30px' }}
              formatter={(value) => (
                <span className="text-[12px] 2xl:text-[14px] font-bold text-primary dark:text-sky-400 uppercase tracking-widest">{value}</span>
              )}
            />
            <Bar yAxisId="left" dataKey="deliveryVolume" stackId="volume" fill="#10b981" barSize={40} name="Delivery Volume" radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="intradayVolume" stackId="volume" fill="#f59e0b" barSize={40} name="Intraday Volume" radius={[8, 8, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="deliveryPercent" stroke="#14b8a6" strokeWidth={3} dot={{ fill: '#14b8a6', r: 6, strokeWidth: 3, stroke: 'var(--card)' }} activeDot={{ r: 8, strokeWidth: 0 }} name="% Delivery" animationDuration={1500} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily Price & Volume Data Table */}
      <Card className="p-4 2xl:p-6 bg-card shadow-2xl border-border">
        <h3 className="text-base 2xl:text-lg font-black font-['Adani'] text-primary dark:text-sky-300 mb-6 uppercase tracking-widest opacity-90 border-l-4 border-indigo-500 pl-3">Daily Price & Volume Data</h3>
        <div className="border border-border rounded-xl overflow-hidden shadow-xl bg-card">
          <div className="overflow-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left relative">
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-primary dark:bg-slate-900 border-b border-white/10 transition-colors">
                  <th className="py-5 px-6 text-[10px] 2xl:text-[12px] font-black text-white uppercase tracking-widest">Date</th>
                  <th className="text-right py-5 px-6 text-[10px] 2xl:text-[12px] font-black text-white uppercase tracking-widest">APL Price</th>
                  <th className="text-right py-5 px-6 text-[10px] 2xl:text-[12px] font-black text-white uppercase tracking-widest">Nifty 50</th>
                  <th className="text-right py-5 px-6 text-[10px] 2xl:text-[12px] font-black text-white uppercase tracking-widest">Delivery Vol.</th>
                  <th className="text-right py-5 px-6 text-[10px] 2xl:text-[12px] font-black text-white uppercase tracking-widest">Intraday Vol.</th>
                  <th className="text-right py-5 px-6 text-[10px] 2xl:text-[12px] font-black text-white uppercase tracking-widest">% Delivery</th>
                </tr>
              </thead>
              <tbody>
                {priceVolumeData.map((row, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-primary/5 transition-all">
                    <td className="py-4 px-6 text-[13px] 2xl:text-[15px] font-black text-primary dark:text-sky-300 uppercase">{row.date}</td>
                    <td className="py-4 px-6 text-[13px] 2xl:text-[15px] font-mono font-black text-right text-primary dark:text-foreground">₹{row.aplPrice?.toFixed(2)}</td>
                    <td className="py-4 px-6 text-[13px] 2xl:text-[15px] font-mono text-right text-muted-foreground">{row.niftyPrice?.toLocaleString()}</td>
                    <td className="py-4 px-6 text-[13px] 2xl:text-[15px] font-mono font-black text-right text-emerald-600 dark:text-emerald-400">{row.deliveryVolume?.toLocaleString()}</td>
                    <td className="py-4 px-6 text-[13px] 2xl:text-[15px] font-mono text-right text-amber-600 dark:text-amber-500">{row.intradayVolume?.toLocaleString()}</td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-mono text-[12px] 2xl:text-[14px] font-black text-sky-500 dark:text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md">{row.deliveryPercent?.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}