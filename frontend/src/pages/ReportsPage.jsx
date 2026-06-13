import { useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { Card, SectionHeader, Btn, Input, EmptyState, Alert, ProgressBar, Icon, fmt, CAT_COLORS } from "../components/shared/UI";
import { CategoryPie, MonthlyBar, IncomeVsExpense, CashFlow } from "../components/shared/Charts";
import * as api from "../services/api";

export default function ReportsPage() {
  const { analytics, transactions, goals } = useApp();
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "eda",      label: "Analysis" },
    { id: "goals",    label: "Goals" },
    { id: "export",   label: "Export" },
  ];

  async function handleEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Enter a valid email address."); return; }
    setEmailErr(""); setSending(true);
    try {
      const { data } = await api.sendReport({ toEmail: email });
      if (data.emailFailed) {
        toast("Email service unavailable — use the PDF download instead.", { duration: 5000 });
      } else {
        toast.success(`Report emailed to ${email}.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send report.");
    } finally { setSending(false); }
  }

  function handlePDF() {
    if (!analytics) { toast.error("No data to export."); return; }
    setExporting(true);
    try {
      const catRows = Object.entries(analytics.catTotals || {})
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `<tr><td style="padding:8px 12px">${cat}</td><td style="padding:8px 12px;text-align:right;font-weight:600">₹${amt.toLocaleString("en-IN")}</td><td style="padding:8px 12px;text-align:right">${Math.round(amt / analytics.total * 100)}%</td></tr>`).join("");
      const goalRows = goals.map(g => `<tr><td style="padding:8px 12px">${g.title}</td><td style="padding:8px 12px;text-align:right">₹${g.savedAmount.toLocaleString("en-IN")}</td><td style="padding:8px 12px;text-align:right">₹${g.targetAmount.toLocaleString("en-IN")}</td><td style="padding:8px 12px;text-align:right">${Math.round(g.savedAmount / g.targetAmount * 100)}%</td></tr>`).join("");
      const scoreColor = analytics.healthScore >= 70 ? "#059669" : analytics.healthScore >= 45 ? "#d97706" : "#dc2626";
      const html = `<!DOCTYPE html><html><head><title>SpendSmart Financial Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
        <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;background:#f4f5f9;color:#13151b;padding:40px}
        .container{max-width:720px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
        .header{background:#4f46e5;color:#fff;padding:32px 40px}
        .header h1{font-size:24px;font-weight:700;margin-bottom:4px}.header p{opacity:.8;font-size:13px}
        .body{padding:32px 40px}.section{margin-bottom:32px}
        h2{font-size:15px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e5e7ef}
        table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f3f4f8;padding:8px 12px;text-align:left;color:#7c8396;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
        tr:nth-child(even) td{background:#f9fafc}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
        .kpi{background:#f3f4f8;border-radius:10px;padding:14px}.kpi .val{font-size:20px;font-weight:700;margin-top:4px}.kpi .lbl{font-size:11px;color:#7c8396}
        .score{display:flex;align-items:center;gap:16px;padding:20px;background:#f3f4f8;border-radius:10px;margin-bottom:20px}
        .score-num{font-size:38px;font-weight:700}.warn{background:#fdf6e9;border-left:3px solid #d97706;padding:10px 16px;border-radius:0 8px 8px 0;margin:6px 0;font-size:13px}
        .warn.high{background:#fdf0f0;border-color:#dc2626}footer{text-align:center;color:#7c8396;font-size:11px;padding:20px 40px;border-top:1px solid #e5e7ef}</style>
        </head><body><div class="container">
        <div class="header"><h1>SpendSmart Financial Report</h1><p>Generated ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p></div>
        <div class="body">
        <div class="section"><h2>Financial Summary</h2>
        <div class="grid">
          <div class="kpi"><div class="lbl">Total Spent</div><div class="val" style="color:#dc2626">₹${analytics.total.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Total Income</div><div class="val" style="color:#059669">₹${analytics.totalIncome.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Net Savings</div><div class="val" style="color:#4f46e5">₹${analytics.netSavings.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Savings Rate</div><div class="val" style="color:#4f46e5">${analytics.savingsRate}%</div></div>
          <div class="kpi"><div class="lbl">Avg Daily Spend</div><div class="val">₹${analytics.avgDaily.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Forecast Next Month</div><div class="val">₹${analytics.predictedNextMonth.toLocaleString("en-IN")}</div></div>
        </div></div>
        <div class="section"><h2>Financial Health Score</h2>
        <div class="score"><div class="score-num" style="color:${scoreColor}">${analytics.healthScore}</div><div><div style="font-size:15px;font-weight:700;color:${scoreColor}">${analytics.healthScore >= 70 ? "Healthy" : analytics.healthScore >= 45 ? "Fair" : "Needs Attention"}</div><div style="font-size:12px;color:#7c8396;margin-top:4px">Based on savings rate, category balance, anomalies, and subscription load</div></div></div></div>
        <div class="section"><h2>Category Breakdown</h2>
        <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Total</th></tr></thead><tbody>${catRows}</tbody></table></div>
        ${analytics.warnings?.length ? `<div class="section"><h2>Alerts</h2>${analytics.warnings.map(w => `<div class="warn ${w.severity === "high" ? "high" : ""}"><strong>${w.type}:</strong> ${w.message}</div>`).join("")}</div>` : ""}
        ${analytics.outliers?.length ? `<div class="section"><h2>Unusual Transactions</h2><table><thead><tr><th>Date</th><th>Merchant</th><th style="text-align:right">Amount</th></tr></thead><tbody>${analytics.outliers.map(o => `<tr><td style="padding:8px 12px">${o.date}</td><td style="padding:8px 12px">${o.merchant}</td><td style="padding:8px 12px;text-align:right;color:#dc2626;font-weight:600">₹${o.amount.toLocaleString("en-IN")}</td></tr>`).join("")}</tbody></table></div>` : ""}
        ${goals.length ? `<div class="section"><h2>Goal Progress</h2><table><thead><tr><th>Goal</th><th style="text-align:right">Saved</th><th style="text-align:right">Target</th><th style="text-align:right">Progress</th></tr></thead><tbody>${goalRows}</tbody></table></div>` : ""}
        <div class="section"><h2>Spending Habits</h2>
        <div class="grid">
          <div class="kpi"><div class="lbl">Typical Payment (half are below this)</div><div class="val">₹${analytics.median.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Daily Average</div><div class="val">₹${analytics.avgDaily.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Biggest Single Payment</div><div class="val">₹${analytics.max.toLocaleString("en-IN")}</div></div>
          <div class="kpi"><div class="lbl">Top Category</div><div class="val">${analytics.highestCategory ? analytics.highestCategory.name : "—"}</div></div>
        </div></div>
        </div><footer>SpendSmart · Financial Intelligence Platform · Confidential · ${new Date().getFullYear()}</footer></div></body></html>`;
      const win = window.open("", "_blank");
      if (!win) { toast.error("Popup blocked — allow popups to download the PDF."); setExporting(false); return; }
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); setExporting(false); }, 800);
    } catch { toast.error("PDF export failed."); setExporting(false); }
  }

  const score = analytics?.healthScore || 0;
  const scoreColor = score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--danger)";

  if (!analytics) return (
    <Card>
      <EmptyState icon="reports" title="No data to report"
        sub="Import a statement or add transactions to generate a full financial report." />
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-stroke rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border-0 ${activeTab === t.id ? "bg-primary text-white [.dark_&]:text-[#0b0d13]" : "bg-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          {/* Health score hero */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="9"
                    strokeDasharray={`${score * 2.638} 263.8`} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold tnum tracking-tight" style={{ color: scoreColor }}>{score}</p>
                  <p className="text-[10px] text-muted">/ 100</p>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-bold text-ink mb-1 tracking-tight">
                  Financial Health: <span style={{ color: scoreColor }}>{score >= 70 ? "Healthy" : score >= 45 ? "Fair" : "Needs Attention"}</span>
                </p>
                <p className="text-sm text-muted mb-3">Calculated from savings rate, category balance, anomaly count, and subscription load.</p>
                {analytics.scoreParts?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                    {analytics.scoreParts.map((p, i) => (
                      <span key={i} className="text-[11px] px-2 py-1 rounded-md font-medium border border-stroke bg-surface2"
                        style={{ color: p.delta > 0 ? "var(--success)" : "var(--danger)" }}>
                        {p.delta > 0 ? "+" : ""}{p.delta} {p.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total Spent",      v: fmt(analytics.total),             c: "var(--danger)" },
              { l: "Total Income",     v: fmt(analytics.totalIncome),       c: "var(--success)" },
              { l: "Net Savings",      v: fmt(analytics.netSavings),        c: "var(--primary)" },
              { l: "Savings Rate",     v: `${analytics.savingsRate}%`,      c: "var(--primary)" },
              { l: "Expense Ratio",    v: analytics.expenseRatio !== null ? `${analytics.expenseRatio}%` : "—", c: "var(--warning)" },
              { l: "Subscriptions",    v: fmt(analytics.subscriptionCost),  c: "#a855f7" },
              { l: "Forecast Next Mo", v: fmt(analytics.predictedNextMonth),c: "#ec4899" },
              { l: "Transactions",     v: analytics.totalTransactions,      c: "#06b6d4" },
            ].map(k => (
              <Card key={k.l} className="p-4">
                <p className="text-[11px] text-muted uppercase tracking-wide mb-1">{k.l}</p>
                <p className="text-lg font-bold tnum tracking-tight" style={{ color: k.c }}>{k.v}</p>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5"><SectionHeader title="Category Breakdown" /><CategoryPie catTotals={analytics.catTotals} total={analytics.total} /></Card>
            <Card className="p-5"><SectionHeader title="Income vs Expense" /><IncomeVsExpense analytics={analytics} /></Card>
          </div>
          {analytics.monthlyTrend?.length > 1 && (
            <Card className="p-5"><SectionHeader title="Monthly Cash Flow" sub="Income, expense, and net by month" /><CashFlow monthlyTrend={analytics.monthlyTrend} /></Card>
          )}

          {/* Warnings */}
          {analytics.warnings?.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="Alerts" />
              <div className="space-y-2">
                {analytics.warnings.map((w, i) => (
                  <div key={i} className="flex gap-3 p-3.5 rounded-xl border border-stroke bg-surface2">
                    <span style={{ color: w.severity === "high" ? "var(--danger)" : w.severity === "medium" ? "var(--warning)" : "var(--info)" }}>
                      <Icon name={w.severity === "high" ? "alertCircle" : w.severity === "medium" ? "alertTriangle" : "info"} size={15} />
                    </span>
                    <div>
                      <p className="text-xs font-bold mb-0.5" style={{ color: w.severity === "high" ? "var(--danger)" : w.severity === "medium" ? "var(--warning)" : "var(--info)" }}>{w.type}</p>
                      <p className="text-xs text-ink2 leading-relaxed">{w.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === "eda" && (
        <>
          <Card className="p-5">
            <SectionHeader title="Your Spending Habits" sub="What your transaction pattern actually says" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              {(() => {
                const expenses = transactions.filter(t => t.type === "expense" || !t.type);
                const biggest = expenses.reduce((m, t) => (!m || t.amount > m.amount) ? t : m, null);
                const visits = {};
                expenses.forEach(t => { visits[t.merchant] = (visits[t.merchant] || 0) + 1; });
                const mostVisited = Object.entries(visits).sort((a, b) => b[1] - a[1])[0];
                const peakDay = (analytics.dailyTrend || []).reduce((m, d) => (!m || d.amount > m.amount) ? d : m, null);
                const habits = [
                  { l: "Typical Payment", v: fmt(analytics.median), desc: "Half of your payments are below this amount" },
                  { l: "Daily Average",   v: fmt(analytics.avgDaily), desc: "What an average spending day costs you" },
                  biggest && { l: "Biggest Payment", v: fmt(biggest.amount), desc: `${biggest.merchant} on ${biggest.date}` },
                  mostVisited && { l: "Most Frequent Merchant", v: mostVisited[0], desc: `${mostVisited[1]} payments made here`, small: true },
                  peakDay && { l: "Heaviest Spending Day", v: fmt(peakDay.amount), desc: `On ${peakDay.date}` },
                  analytics.highestCategory && { l: "Top Category", v: analytics.highestCategory.name, desc: `${fmt(analytics.highestCategory.amount)} — ${Math.round(analytics.highestCategory.amount / analytics.total * 100)}% of all spending`, small: true },
                ].filter(Boolean);
                return habits.map(s => (
                  <div key={s.l} className="p-4 rounded-2xl bg-surface2 border border-stroke">
                    <p className={`font-bold text-primary tracking-tight ${s.small ? "text-sm truncate" : "text-lg tnum"}`}>{s.v}</p>
                    <p className="text-xs font-semibold text-ink mt-1">{s.l}</p>
                    <p className="text-[10px] text-muted mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                ));
              })()}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { l: "Weekend Total",   v: fmt(analytics.weekendTotal),          desc: `${fmt(analytics.avgWeekendPerDay)}/day avg` },
                { l: "Weekday Total",   v: fmt(analytics.weekdayTotal),          desc: `${fmt(analytics.avgWeekdayPerDay)}/day avg` },
                { l: "Anomalies",       v: analytics.outliers?.length || 0,      desc: "Multi-signal detection" },
                { l: "Subscriptions",   v: analytics.subscriptions?.length || 0, desc: `${fmt(analytics.subscriptionCost)}/month` },
                { l: "Recurring",       v: analytics.recurring?.length || 0,     desc: "Same merchant and amount" },
                { l: "Categories Used", v: Object.keys(analytics.catTotals).length, desc: "Unique categories" },
              ].map(s => (
                <div key={s.l} className="p-3.5 rounded-xl border border-stroke bg-surface">
                  <p className="text-lg font-bold text-ink tnum tracking-tight">{s.v}</p>
                  <p className="text-xs font-medium text-ink2 mt-0.5">{s.l}</p>
                  <p className="text-[10px] text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Category Analysis" sub="Detailed breakdown of every spending category" />
            <div className="space-y-2">
              {Object.entries(analytics.catTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                const pct = Math.round(amt / analytics.total * 100);
                const isHigh = (cat === "Shopping" && pct > 25) || (cat === "Food" && pct > 15) || (cat === "Entertainment" && pct > 15);
                return (
                  <div key={cat} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface2 transition-colors">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[cat] || "#9ca3af" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-ink">{cat}</span>
                        <div className="flex items-center gap-2">
                          {isHigh && <span className="text-[10px] font-bold text-danger uppercase tracking-wide">High</span>}
                          <span className="text-sm font-bold text-ink tnum">{fmt(amt)}</span>
                          <span className="text-xs text-muted w-9 text-right tnum">{pct}%</span>
                        </div>
                      </div>
                      <ProgressBar value={amt} max={analytics.total} color={CAT_COLORS[cat] || "#9ca3af"} height={4} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {analytics.outliers?.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="Anomaly Report" sub="Transactions unusual on amount, merchant, category, or timing" />
              <Alert type="warning">These transactions deviate from your spending pattern on multiple signals. Confirm expected ones on the dashboard to remove them.</Alert>
              <div className="space-y-2">
                {analytics.outliers.map((o, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-stroke" style={{ background: "var(--danger-soft)" }}>
                    <div>
                      <p className="text-sm font-bold text-ink">{o.merchant}</p>
                      <p className="text-xs text-muted">{o.date} · {o.category} · score {o.score}</p>
                    </div>
                    <p className="text-base font-bold text-danger tnum">{fmt(o.amount)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === "goals" && (
        goals.length === 0 ? (
          <Card><EmptyState icon="target" title="No goals created" sub="Create goals from the Goals page to track them here." /></Card>
        ) : (
          <Card className="p-5">
            <SectionHeader title="Goals Overview" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { l: "Total",     v: goals.length,                                        c: "var(--primary)" },
                { l: "Completed", v: goals.filter(g => g.status === "completed").length,  c: "var(--success)" },
                { l: "Active",    v: goals.filter(g => g.status === "active").length,     c: "var(--warning)" },
              ].map(s => (
                <div key={s.l} className="p-3 rounded-xl bg-surface2 border border-stroke text-center">
                  <p className="text-xl font-bold tnum" style={{ color: s.c }}>{s.v}</p>
                  <p className="text-xs text-muted">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {goals.map(g => {
                const pct = Math.min(Math.round(g.savedAmount / g.targetAmount * 100), 100);
                return (
                  <div key={g._id || g.id} className="p-4 rounded-2xl border border-stroke">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{g.title}</p>
                        <p className="text-xs text-muted capitalize">{g.type} · {g.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tnum" style={{ color: g.color }}>{pct}%</p>
                        <p className="text-xs text-muted tnum">{fmt(g.savedAmount)} / {fmt(g.targetAmount)}</p>
                      </div>
                    </div>
                    <ProgressBar value={g.savedAmount} max={g.targetAmount} color={g.status === "completed" ? "var(--success)" : g.color} height={6} />
                  </div>
                );
              })}
            </div>
          </Card>
        )
      )}

      {activeTab === "export" && (
        <div className="space-y-4">
          <Card className="p-6">
            <SectionHeader title="Download PDF Report" sub="Full report with health score, breakdowns, anomalies, goals, and alerts" />
            <p className="text-sm text-ink2 mb-4 leading-relaxed">Generates a professional report and opens the browser print dialog — choose "Save as PDF".</p>
            <Btn onClick={handlePDF} disabled={exporting} size="lg" icon="download">
              {exporting ? "Generating…" : "Download PDF Report"}
            </Btn>
          </Card>

          <Card className="p-6">
            <SectionHeader title="Email Report" sub="Send the financial health report to any inbox" />
            <p className="text-sm text-muted mb-4">If the email service is unavailable, the PDF download above always works.</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }} placeholder="your@email.com" type="email" error={emailErr} />
              </div>
              <Btn onClick={handleEmail} disabled={sending} icon="send">
                {sending ? "Sending…" : "Send"}
              </Btn>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Quick Stats" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Transactions", v: analytics.totalTransactions },
                { l: "Date Range",   v: `${transactions[transactions.length - 1]?.date || "—"} to ${transactions[0]?.date || "—"}` },
                { l: "Categories",   v: Object.keys(analytics.catTotals).length },
                { l: "Anomalies",    v: analytics.outliers?.length || 0 },
              ].map(s => (
                <div key={s.l} className="p-3 bg-surface2 border border-stroke rounded-xl">
                  <p className="text-xs text-muted">{s.l}</p>
                  <p className="text-sm font-bold text-ink mt-0.5 tnum">{s.v}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
