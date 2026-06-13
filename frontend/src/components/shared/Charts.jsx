import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer, CartesianGrid, ComposedChart } from "recharts";
import { CAT_COLORS, fmt } from "./UI";
import { useApp } from "../../context/AppContext";

/* Recharts sets colors as SVG attributes, so CSS variables must be
   resolved to concrete values. Re-resolves whenever theme changes. */
function useChartTheme() {
  const { theme } = useApp();
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const v = name => css.getPropertyValue(name).trim();
    return {
      grid: v("--stroke"), axis: v("--muted"), surface: v("--surface"),
      stroke: v("--stroke-strong"), ink: v("--ink"),
      primary: v("--primary"), success: v("--success"), danger: v("--danger"),
      tooltip: {
        contentStyle: { background: v("--surface"), border: `1px solid ${v("--stroke")}`, borderRadius: 10, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", color: v("--ink") },
        labelStyle: { color: v("--ink-2"), fontWeight: 600 },
        itemStyle: { color: v("--ink") },
        cursor: { fill: v("--surface-2") },
      },
    };
  }, [theme]);
}

export function CategoryPie({ catTotals, total }) {
  const t = useChartTheme();
  const data = Object.entries(catTotals || {})
    .map(([name, value]) => ({ name, value, pct: Math.round(value / total * 100) }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={88} dataKey="value" paddingAngle={3} stroke="none">
            {data.map(e => <Cell key={e.name} fill={CAT_COLORS[e.name] || "#9ca3af"} />)}
          </Pie>
          <Tooltip formatter={v => fmt(v)} {...t.tooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {data.map(e => (
          <div key={e.name} className="flex items-center gap-1.5 text-xs text-ink2">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[e.name] || "#9ca3af" }} />
            {e.name} <span className="text-faint tnum">{e.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyBar({ weeklyTrend }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={weeklyTrend || []} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="week" tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip formatter={fmt} {...t.tooltip} />
        <Bar dataKey="amount" fill={t.primary} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyLine({ dailyTrend }) {
  const t = useChartTheme();
  const data = (dailyTrend || []).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fill: t.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
        <YAxis hide />
        <Tooltip formatter={fmt} {...t.tooltip} />
        <Line type="monotone" dataKey="amount" stroke={t.success} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: t.success }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* Monthly cash flow — income vs expense bars + net savings line */
export function CashFlow({ monthlyTrend }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={210}>
      <ComposedChart data={monthlyTrend || []} barSize={16} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip formatter={fmt} {...t.tooltip} />
        <Bar dataKey="income" name="Income" fill={t.success} radius={[4, 4, 0, 0]} />
        <Bar dataKey="amount" name="Expense" fill={t.danger} radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="net" name="Net" stroke={t.primary} strokeWidth={2} dot={{ r: 3, fill: t.primary }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBar({ monthlyTrend }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={monthlyTrend || []} barSize={32} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip formatter={fmt} {...t.tooltip} />
        <Bar dataKey="amount" fill={t.primary} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IncomeVsExpense({ analytics }) {
  const t = useChartTheme();
  const data = [
    { name: "Income", amount: analytics?.totalIncome || 0 },
    { name: "Expense", amount: analytics?.total || 0 },
    { name: "Savings", amount: Math.max(analytics?.netSavings || 0, 0) },
  ];
  const colors = [t.success, t.danger, t.primary];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={36} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: t.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip formatter={fmt} {...t.tooltip} />
        <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
          {data.map((e, i) => <Cell key={i} fill={colors[i]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
