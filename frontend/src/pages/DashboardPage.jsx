import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useApp, PERIODS } from "../context/AppContext";
import { Card, KPICard, SectionHeader, Btn, Modal, Input, Select, Textarea, EmptyState, PageSpinner, Alert, ProgressBar, Icon, MerchantAvatar, fmt } from "../components/shared/UI";
import { CategoryPie, WeeklyBar, DailyLine, CashFlow } from "../components/shared/Charts";
import MarketWidget from "../components/shared/MarketWidget";
import * as api from "../services/api";

const PRIORITIES = ["Savings", "Food", "Health", "Travel", "Shopping", "Education", "Family", "Entertainment", "Others"];

export default function DashboardPage({ onNavigate, params }) {
  const { analytics, notes, fetchNotes, fetchTransactions, refreshAll, applyAnalytics, confirmExpected, transactions, goals, loading, period, setPeriod } = useApp();
  const [priority, setPriority] = useState("Savings");
  const [customGoal, setCustomGoal] = useState("");
  const [recs, setRecs] = useState(null);
  const [sliders, setSliders] = useState({ food: 15, travel: 10, shopping: 15 });
  const [noteModal, setNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", description: "", amount: "", dueDate: "", priority: "medium" });
  const [previewData, setPreviewData] = useState(null);
  const [previewModal, setPreviewModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [scoreModal, setScoreModal] = useState(false);
  const fileRef = useRef();
  const anomaliesRef = useRef(null);
  const subsRef = useRef(null);
  const scrollTo = ref => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    if (!analytics) { setRecs(null); return; }
    api.getRecommendations({ priority, customGoal }).then(r => setRecs(r.data)).catch(() => {});
  }, [analytics, priority, customGoal]);

  async function processFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls", "pdf"].includes(ext)) { toast.error("Only CSV, XLSX, or PDF files are supported."); return; }
    setUploadLoading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.previewFile(form);
      if (data.total === 0) {
        toast.error("No valid transactions found in this file. Check the format and try again.");
        return;
      }
      setPreviewData(data);
      setPreviewModal(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to read file.");
    } finally { setUploadLoading(false); }
  }
  function handleFileSelect(e) { processFile(e.target.files[0]); e.target.value = ""; }
  function handleDrop(e) { e.preventDefault(); processFile(e.dataTransfer.files?.[0]); }

  async function loadSampleData() {
    setSampleLoading(true);
    try {
      const { data } = await api.loadSample();
      applyAnalytics(data.analytics);
      fetchTransactions();
      toast.success("Sample data loaded — explore away!");
    } catch { toast.error("Couldn't load sample data. Please try again."); }
    finally { setSampleLoading(false); }
  }

  async function clearSampleData() {
    setClearing(true);
    try {
      await api.clearSample();
      await refreshAll();
      toast.success("Sample data cleared.");
    } catch { toast.error("Couldn't clear sample data. Please try again."); }
    finally { setClearing(false); }
  }

  async function confirmImport() {
    if (!previewData?.filePath) return;
    setUploadLoading(true);
    try {
      const { data } = await api.confirmImport({ filePath: previewData.filePath });
      toast.success(`Imported ${data.imported} transactions.`);
      if (data.issues?.alreadyInSystem > 0) toast(`${data.issues.alreadyInSystem} rows skipped — already in your data from a previous import.`, { duration: 5000 });
      if (data.issues?.duplicate > 0) toast(`${data.issues.duplicate} duplicate rows in the file skipped.`);
      if (data.issues?.missing > 0) toast(`${data.issues.missing} rows skipped (missing data).`);
      setPreviewModal(false);
      setPreviewData(null);
      applyAnalytics(data.analytics);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || "Import failed.");
    } finally { setUploadLoading(false); }
  }

  async function addNote() {
    if (!noteForm.title.trim()) { toast.error("Title is required."); return; }
    try {
      await api.createNote(noteForm);
      toast.success("Reminder added.");
      setNoteModal(false);
      setNoteForm({ title: "", description: "", amount: "", dueDate: "", priority: "medium" });
      fetchNotes();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to add reminder."); }
  }

  async function markDone(id) {
    try { await api.updateNote(id, { status: "done" }); fetchNotes(); toast.success("Marked as done."); }
    catch { toast.error("Failed to update."); }
  }

  async function handleConfirmExpected(o) {
    if (!o.id) { toast.error("Cannot confirm this transaction — re-import the data."); return; }
    setConfirming(o.id);
    try {
      await confirmExpected(o.id);
      toast.success(`${o.merchant} marked as expected.`);
    } catch { toast.error("Failed to confirm."); }
    finally { setConfirming(null); }
  }

  const simSave = Math.round(
    (analytics?.catTotals?.Food || 0) * sliders.food / 100 +
    (analytics?.catTotals?.Travel || 0) * sliders.travel / 100 +
    (analytics?.catTotals?.Shopping || 0) * sliders.shopping / 100
  );

  const score = analytics?.healthScore || 0;
  const scoreColor = score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--danger)";
  const pendingNotes = notes.filter(n => n.status !== "done").slice(0, 4);
  const budget = analytics?.budget;

  // Achievements — derived from live data
  const achievements = [
    { id: "first-txn",  label: "First Transaction",  desc: "Record your first transaction",        done: transactions.length > 0 },
    { id: "ten-txn",    label: "Getting Serious",     desc: "Track 10 or more transactions",        done: transactions.length >= 10 },
    { id: "first-goal", label: "Goal Setter",         desc: "Create your first savings goal",       done: goals.length > 0 },
    { id: "goal-done",  label: "Goal Achiever",       desc: "Complete a savings goal",              done: goals.some(g => g.status === "completed") },
    { id: "saver",      label: "Smart Saver",         desc: "Reach a 15% savings rate",             done: (analytics?.savingsRate || 0) >= 15 },
    { id: "healthy",    label: "Financially Fit",     desc: "Reach a health score of 70+",          done: score >= 70 },
    { id: "import",     label: "Power User",          desc: "Import a bank statement",              done: transactions.some(t => t.source === "upload") },
    { id: "reminder",   label: "Organised",           desc: "Set up a payment reminder",            done: notes.length > 0 },
  ];
  const unlocked = achievements.filter(a => a.done).length;

  if (loading && !analytics) return <PageSpinner />;

  return (
    <div className="space-y-4">

      <MarketWidget />

      {transactions.some(t => t.importId === "sample") && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-surface border border-stroke">
          <span style={{ color: "var(--info)" }}><Icon name="info" size={16} /></span>
          <p className="flex-1 text-xs text-ink2">
            You're exploring with <strong className="text-ink">sample data</strong>. It clears automatically the moment you import or add a real transaction.
          </p>
          <Btn size="xs" variant="secondary" onClick={clearSampleData} disabled={clearing}>
            {clearing ? "Clearing…" : "Clear & start fresh"}
          </Btn>
        </div>
      )}

      {/* Toolbar: period + upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-surface border border-stroke rounded-xl p-1" data-tour="period">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-0 ${period === p.key ? "bg-primary text-white [.dark_&]:text-[#0b0d13]" : "bg-transparent text-muted hover:text-ink"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFileSelect} />
          <Btn onClick={() => fileRef.current.click()} disabled={uploadLoading} icon={uploadLoading ? undefined : "upload"} data-tour="import">
            {uploadLoading ? "Parsing…" : "Import Statement"}
          </Btn>
          <Btn variant="secondary" icon="plus" onClick={() => onNavigate?.("transactions")}>Add Manually</Btn>
        </div>
      </div>

      {!analytics ? (
        <Card className="p-6">
          <div className="text-center max-w-lg mx-auto py-4">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center text-primary" style={{ background: "var(--primary-soft)" }}>
              <Icon name="sparkles" size={22} />
            </div>
            <h2 className="text-lg font-bold text-ink tracking-tight mb-1">Welcome to SpendSmart</h2>
            <p className="text-sm text-muted mb-6">Get started in seconds — pick how you'd like to begin.</p>

            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-stroke rounded-2xl p-6 mb-4 cursor-pointer hover:border-primary transition-colors">
              <span className="text-muted"><Icon name="upload" size={20} className="mx-auto mb-2" /></span>
              <p className="text-sm font-medium text-ink2">Drop a statement here, or click to browse</p>
              <p className="text-xs text-muted mt-1">CSV, Excel, or PDF bank / UPI statement</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Btn onClick={loadSampleData} disabled={sampleLoading} icon={sampleLoading ? undefined : "zap"}>
                {sampleLoading ? "Loading…" : "Try sample data"}
              </Btn>
              <Btn variant="secondary" icon="upload" onClick={() => fileRef.current.click()}>Import statement</Btn>
              <Btn variant="secondary" icon="plus" onClick={() => onNavigate?.("transactions")}>Add manually</Btn>
            </div>

            <p className="text-xs text-muted mt-5">
              Not sure about the format?{" "}
              <a href="/sample-statement.csv" download className="text-primary font-medium hover:underline">Download a sample CSV</a>
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI row — every card leads somewhere */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-tour="kpis">
            <KPICard label="Total Spent"  value={fmt(analytics.total)}       sub={`${analytics.totalTransactions} transactions`} color="var(--danger)" icon="creditCard"
              hint="See all expenses" onClick={() => onNavigate?.("transactions", { type: "expense" })} />
            <KPICard label="Total Income" value={fmt(analytics.totalIncome)} sub={analytics.expenseRatio !== null ? `${analytics.expenseRatio}% expense ratio` : "no income recorded"} color="var(--success)" icon="banknote"
              hint="See all income" onClick={() => onNavigate?.("transactions", { type: "income" })} />
            <KPICard label="Net Savings"  value={fmt(analytics.netSavings)}  sub={`${analytics.savingsRate}% savings rate`} color="var(--primary)" icon="wallet"
              hint="Full report" onClick={() => onNavigate?.("reports")} />
            <KPICard label="Health Score" value={`${score}/100`}             sub={score >= 70 ? "Healthy" : score >= 45 ? "Fair" : "Needs attention"} color={scoreColor} icon="shield"
              hint="How is this calculated?" onClick={() => setScoreModal(true)} />
          </div>

          {/* Budget with carry-forward — or a clear setup path when unset */}
          {budget ? (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink tracking-tight">This Month's Budget</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {fmt(budget.monthly)} monthly limit
                    {budget.carryForward > 0 && <span className="text-success font-medium"> + {fmt(budget.carryForward)} unspent from last month</span>}
                    {" "}= {fmt(budget.available)} to spend
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tnum" style={{ color: budget.exceeded ? "var(--danger)" : "var(--ink)" }}>{fmt(budget.spentThisMonth)}</p>
                  <p className="text-xs text-muted">spent so far</p>
                </div>
              </div>
              <ProgressBar value={budget.spentThisMonth} max={budget.available} height={8}
                color={budget.exceeded ? "var(--danger)" : budget.usedPct >= 80 ? "var(--warning)" : "var(--success)"} />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-medium" style={{ color: budget.exceeded ? "var(--danger)" : "var(--muted)" }}>
                  {budget.exceeded
                    ? `Over budget by ${fmt(Math.abs(budget.remaining))} — review your biggest categories below`
                    : `${fmt(budget.remaining)} left for the rest of the month`}
                </p>
                <button onClick={() => onNavigate?.("settings")}
                  className="text-[11px] font-medium text-faint hover:text-primary transition-colors bg-transparent border-0 flex items-center gap-0.5">
                  Adjust budget <Icon name="chevronRight" size={10} />
                </button>
              </div>
            </Card>
          ) : (
            <Card className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-primary flex-shrink-0" style={{ background: "var(--primary-soft)" }}>
                  <Icon name="wallet" size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Set a monthly budget</p>
                  <p className="text-xs text-muted mt-0.5">Track how much of your monthly limit is used — unspent money carries forward to the next month.</p>
                </div>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => onNavigate?.("settings")}>Set Budget</Btn>
            </Card>
          )}

          {/* Warnings — clickable when there's a section to inspect */}
          {analytics.warnings?.length > 0 && (
            <div className="space-y-2">
              {analytics.warnings.map((w, i) => {
                const target = w.type === "Anomalies" ? () => scrollTo(anomaliesRef)
                  : w.type === "Subscriptions" ? () => scrollTo(subsRef)
                  : (w.type === "Food" || w.type === "Shopping") ? () => onNavigate?.("transactions", { category: w.type })
                  : (w.type === "Budget Exceeded" || w.type === "Budget Alert") ? () => onNavigate?.("transactions", { type: "expense" })
                  : null;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={target || undefined}
                    className={`flex items-start gap-3 rounded-xl px-4 py-3 bg-surface border border-stroke ${target ? "cursor-pointer hover:border-strokeStrong transition-colors group" : ""}`}>
                    <span className="mt-0.5" style={{ color: w.severity === "high" ? "var(--danger)" : w.severity === "medium" ? "var(--warning)" : "var(--info)" }}>
                      <Icon name={w.severity === "high" ? "alertCircle" : w.severity === "medium" ? "alertTriangle" : "info"} size={15} />
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-xs mb-0.5" style={{ color: w.severity === "high" ? "var(--danger)" : w.severity === "medium" ? "var(--warning)" : "var(--info)" }}>{w.type}</p>
                      <p className="text-ink2 text-xs leading-relaxed">{w.message}</p>
                    </div>
                    {target && <span className="text-faint group-hover:text-primary transition-colors mt-1"><Icon name="chevronRight" size={13} /></span>}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="charts">
            <Card className="p-5">
              <SectionHeader title="Category Breakdown" sub="Where your money goes" />
              <CategoryPie catTotals={analytics.catTotals} total={analytics.total} />
            </Card>
            <Card className="p-5">
              <SectionHeader title="Cash Flow" sub="Income vs expense by month" />
              <CashFlow monthlyTrend={analytics.monthlyTrend} />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <SectionHeader title="Weekly Spending" />
              <WeeklyBar weeklyTrend={analytics.weeklyTrend} />
            </Card>
            <Card className="p-5">
              <SectionHeader title="Daily Trend" />
              <DailyLine dailyTrend={analytics.dailyTrend} />
            </Card>
          </div>

          {/* Stats strip — each card leads to its detail */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Avg Daily"      value={fmt(analytics.avgDaily)}           sub="per active day" color="var(--warning)" icon="calendar"
              hint="See all expenses" onClick={() => onNavigate?.("transactions", { type: "expense" })} />
            <KPICard label="Subscriptions"  value={fmt(analytics.subscriptionCost)}   sub={`${analytics.subscriptions?.length || 0} active`} color="#8b5cf6" icon="repeat"
              hint="View subscriptions" onClick={() => scrollTo(subsRef)} />
            <KPICard label="Next Mo. Forecast" value={fmt(analytics.predictedNextMonth)} sub="recency-weighted" color="#ec4899" icon="trendingUp"
              hint="Full report" onClick={() => onNavigate?.("reports")} />
            <KPICard label="Anomalies"      value={analytics.outliers?.length || 0}   sub="unusual transactions" color="var(--danger)" icon="alertTriangle"
              hint={analytics.outliers?.length ? "Review them" : undefined}
              onClick={analytics.outliers?.length ? () => scrollTo(anomaliesRef) : undefined} />
          </div>

          {/* Top merchants — click one to see its transactions */}
          <Card className="p-5">
            <SectionHeader title="Top Merchants" sub="Highest spending — click to see the transactions" />
            <div className="space-y-1">
              {analytics.topMerchants.map(({ merchant, amount }) => (
                <button key={merchant} onClick={() => onNavigate?.("transactions", { search: merchant })}
                  className="w-full flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-surface2 transition-colors text-left border-0 bg-transparent group">
                  <MerchantAvatar merchant={merchant} size={32} />
                  <span className="flex-1 text-sm text-ink font-medium truncate">{merchant}</span>
                  <div className="w-28 h-1.5 rounded-full overflow-hidden bg-surface3 hidden sm:block">
                    <div className="h-full rounded-full bg-primary/50" style={{ width: `${Math.round(amount / analytics.topMerchants[0].amount * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-ink tnum min-w-[72px] text-right">{fmt(amount)}</span>
                  <span className="text-faint group-hover:text-primary transition-colors"><Icon name="chevronRight" size={13} /></span>
                </button>
              ))}
            </div>
          </Card>

          {/* Subscription center — always shown (with an empty state) so it's discoverable */}
          <div ref={subsRef} className="scroll-mt-20">
            <Card className="p-5">
              <SectionHeader title="Subscription Center"
                sub={analytics.subscriptions?.length
                  ? `${fmt(analytics.subscriptionCost)}/month · ${fmt(analytics.subscriptionCost * 12)}/year recurring — click one to see its payments`
                  : "Recurring charges detected from your statements"} />
              {analytics.subscriptions?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analytics.subscriptions.map((s, i) => (
                    <button key={i} onClick={() => onNavigate?.("transactions", { search: s.merchant })}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface2 border border-stroke hover:border-strokeStrong transition-colors text-left">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MerchantAvatar merchant={s.merchant} size={30} />
                        <div className="min-w-0">
                          <p className="text-sm text-ink font-medium truncate">{s.merchant}</p>
                          {s.months > 1 && <p className="text-[11px] text-muted">{s.months} months active</p>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-ink tnum">{fmt(s.amount)}<span className="text-xs text-muted font-normal">/mo</span></p>
                        <p className="text-[11px] text-muted tnum">{fmt(s.amount * 12)}/yr</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface2 flex items-center justify-center text-muted">
                    <Icon name="repeat" size={17} />
                  </div>
                  <p className="text-sm text-muted">No subscriptions detected yet.</p>
                  <p className="text-xs text-faint mt-1 max-w-sm mx-auto">A charge is flagged here once the same merchant bills a similar amount across two or more months. Import a couple of months of statements and your recurring services will show up automatically.</p>
                </div>
              )}
            </Card>
          </div>

          {/* Anomalies with confirmation */}
          {analytics.outliers?.length > 0 && (
            <div ref={anomaliesRef} className="scroll-mt-20">
            <Card className="p-5">
              <SectionHeader title="Unusual Transactions" sub="Flagged by multi-signal anomaly detection — confirm the ones you expected" />
              <div className="space-y-2">
                {analytics.outliers.map((o, i) => (
                  <div key={i} className="flex justify-between items-center gap-3 p-3 rounded-xl border border-stroke" style={{ background: "var(--danger-soft)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <MerchantAvatar merchant={o.merchant} size={32} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{o.merchant}</p>
                        <p className="text-xs text-muted">{o.date} · {o.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold text-danger tnum">{fmt(o.amount)}</span>
                      <Btn size="xs" variant="secondary" icon="check" disabled={confirming === o.id}
                        onClick={() => handleConfirmExpected(o)}>
                        {confirming === o.id ? "…" : "Expected"}
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            </div>
          )}

          {/* Recommendations */}
          <Card className="p-5" data-tour="insights">
            <SectionHeader title="Personalised Recommendations" sub="Adapts to your financial priority" />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${priority === p ? "bg-primary text-white [.dark_&]:text-[#0b0d13] border-transparent font-semibold" : "bg-surface2 text-ink2 border-stroke hover:border-strokeStrong"}`}>
                  {p}
                </button>
              ))}
            </div>
            {priority === "Others" && (
              <input value={customGoal} onChange={e => setCustomGoal(e.target.value)}
                placeholder="Describe your goal — e.g. Buy a MacBook, build an emergency fund"
                className="w-full bg-surface2 border border-stroke rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-faint mb-4"
                style={{ outline: "none" }} />
            )}
            {recs?.recommendations?.length > 0 ? (
              <div className="space-y-2.5">
                {recs.recommendations.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex gap-4 items-start p-4 rounded-xl border border-stroke hover:border-strokeStrong transition-colors">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-primary" style={{ background: "var(--primary-soft)" }}>
                      <Icon name="zap" size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink mb-0.5">{r.title}</p>
                      <p className="text-xs text-muted leading-relaxed">{r.reason}</p>
                    </div>
                    {r.monthlySaving > 0 && (
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[11px] text-muted">Save / month</p>
                        <p className="text-base font-bold text-success tnum">{fmt(r.monthlySaving)}</p>
                        <p className="text-[11px] text-muted tnum">{fmt(r.yearlySaving)}/yr</p>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div className="p-4 rounded-xl border border-stroke" style={{ background: "var(--success-soft)" }}>
                  <p className="text-xs font-semibold text-success mb-1">Total potential monthly savings</p>
                  <p className="text-2xl font-bold text-success tnum tracking-tight">{fmt(recs.totalMonthlySaving)}</p>
                  <p className="text-xs text-success/80 mt-0.5 tnum">{fmt(recs.totalYearlySaving)} saved per year</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted py-4 text-center">Select a priority to see personalised recommendations.</p>
            )}
          </Card>

          {/* What-If Simulator */}
          <Card className="p-5">
            <SectionHeader title="What-If Savings Simulator" sub="Drag sliders to project savings" />
            <div className="space-y-4 mb-5">
              {[
                { key: "food",     label: "Reduce food delivery",  cat: "Food",     color: "#ef4444" },
                { key: "travel",   label: "Reduce travel spend",   cat: "Travel",   color: "#f59e0b" },
                { key: "shopping", label: "Reduce shopping spend", cat: "Shopping", color: "#a855f7" },
              ].map(s => (
                <div key={s.key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-ink2">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tnum" style={{ color: s.color }}>{sliders[s.key]}%</span>
                      <span className="text-xs text-muted tnum">saves {fmt((analytics.catTotals[s.cat] || 0) * sliders[s.key] / 100)}</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={50} step={1} value={sliders[s.key]}
                    onChange={e => setSliders(sl => ({ ...sl, [s.key]: Number(e.target.value) }))}
                    style={{ accentColor: s.color }} />
                </div>
              ))}
            </div>
            <div className="p-4 rounded-2xl border border-stroke" style={{ background: "var(--primary-soft)" }}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-primary font-semibold mb-1">Projected monthly savings</p>
                  <p className="text-3xl font-bold text-primary tnum tracking-tight">{fmt(simSave)}</p>
                  <p className="text-xs text-muted mt-1 tnum">{fmt(simSave * 12)} per year</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted mb-1 tnum">{Math.round(simSave / (analytics.total || 1) * 100)}% of total spend</p>
                  <div className="w-24 h-2 bg-surface3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(Math.round(simSave / (analytics.total || 1) * 100), 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Achievements */}
          <Card className="p-5">
            <SectionHeader title="Achievements" sub={`${unlocked} of ${achievements.length} unlocked`} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {achievements.map(a => (
                <div key={a.id} className={`p-3.5 rounded-xl border transition-colors ${a.done ? "border-stroke" : "border-stroke opacity-45"}`}
                  style={a.done ? { background: "var(--success-soft)" } : { background: "var(--surface-2)" }}>
                  <span className={a.done ? "text-success" : "text-faint"}>
                    <Icon name={a.done ? "award" : "lock"} size={16} />
                  </span>
                  <p className="text-xs font-semibold text-ink mt-2">{a.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">{a.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Notes & Reminders */}
      <Card className="p-5">
        <SectionHeader title="Notes & Reminders"
          action={<Btn size="sm" icon="plus" onClick={() => setNoteModal(true)}>Add Reminder</Btn>} />
        {pendingNotes.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface2 flex items-center justify-center text-muted">
              <Icon name="checkCircle" size={17} />
            </div>
            <p className="text-sm text-muted">No pending reminders. Add bills or upcoming payments.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingNotes.map(n => {
              const isOverdue = n.status === "overdue";
              const pColors = { high: "var(--danger)", medium: "var(--warning)", low: "var(--info)" };
              return (
                <div key={n._id || n.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-stroke"
                  style={{ background: isOverdue ? "var(--danger-soft)" : "var(--surface-2)" }}>
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--surface)", color: pColors[n.priority] }}>
                    <Icon name={isOverdue ? "alertTriangle" : "clock"} size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      {isOverdue && <span className="text-[10px] font-bold text-danger uppercase tracking-wide">Overdue</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize" style={{ background: "var(--surface)", color: pColors[n.priority] }}>{n.priority}</span>
                    </div>
                    {n.description && <p className="text-xs text-muted">{n.description}</p>}
                    <div className="flex gap-3 mt-1">
                      {n.amount > 0 && <span className="text-xs font-semibold text-warning tnum">{fmt(n.amount)}</span>}
                      {n.dueDate && <span className="text-xs text-muted">Due {n.dueDate}</span>}
                    </div>
                  </div>
                  <button onClick={() => markDone(n._id || n.id)} title="Mark as done"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-success hover:opacity-70 transition-opacity flex-shrink-0 border border-stroke bg-surface">
                    <Icon name="check" size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Preview Modal */}
      <Modal open={previewModal} onClose={() => { setPreviewModal(false); setPreviewData(null); }}
        title="Import Preview" subtitle={`${previewData?.total || 0} valid transactions found`} size="xl">
        {previewData && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl text-center border border-stroke" style={{ background: "var(--success-soft)" }}>
                <p className="text-xl font-bold text-success tnum">{previewData.total}</p>
                <p className="text-xs text-muted">Valid rows</p>
              </div>
              <div className="p-3 rounded-xl text-center border border-stroke" style={{ background: "var(--warning-soft)" }}>
                <p className="text-xl font-bold text-warning tnum">{previewData.issues?.duplicate || 0}</p>
                <p className="text-xs text-muted">Duplicates</p>
              </div>
              <div className="p-3 rounded-xl text-center border border-stroke" style={{ background: "var(--danger-soft)" }}>
                <p className="text-xl font-bold text-danger tnum">{(previewData.issues?.missing || 0) + (previewData.issues?.invalidDate || 0)}</p>
                <p className="text-xs text-muted">Skipped</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-ink2 mb-2">Sample (first 10 rows)</p>
            <div className="rounded-xl border border-stroke overflow-hidden mb-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-surface2 border-b border-stroke">
                  <th className="text-left px-3 py-2 text-muted font-semibold">Date</th>
                  <th className="text-left px-3 py-2 text-muted font-semibold">Merchant</th>
                  <th className="text-left px-3 py-2 text-muted font-semibold">Category</th>
                  <th className="text-right px-3 py-2 text-muted font-semibold">Amount</th>
                </tr></thead>
                <tbody>
                  {previewData.preview.map((r, i) => (
                    <tr key={i} className="border-b border-stroke last:border-0">
                      <td className="px-3 py-2 text-muted tnum">{r.date}</td>
                      <td className="px-3 py-2 text-ink font-medium">{r.merchant}</td>
                      <td className="px-3 py-2 text-ink2">{r.category}</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink tnum">{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.issues?.autoCategory > 0 && (
              <Alert type="info">{previewData.issues.autoCategory} categories were auto-detected from merchant names.</Alert>
            )}
            <div className="flex gap-3">
              <Btn onClick={confirmImport} disabled={uploadLoading} className="flex-1" icon="check">
                {uploadLoading ? "Importing…" : `Confirm Import (${previewData.total})`}
              </Btn>
              <Btn variant="secondary" onClick={() => { setPreviewModal(false); setPreviewData(null); }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Health Score Explainer */}
      <Modal open={scoreModal} onClose={() => setScoreModal(false)} title="How your Health Score works"
        subtitle="A 0–100 measure of your financial habits in this period">
        <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-surface2 border border-stroke">
          <p className="text-4xl font-bold tnum" style={{ color: scoreColor }}>{score}</p>
          <div>
            <p className="text-sm font-semibold text-ink">{score >= 70 ? "Healthy" : score >= 45 ? "Fair" : "Needs attention"}</p>
            <p className="text-xs text-muted mt-0.5">Everyone starts at a neutral 50. Good habits add points, risky patterns subtract them.</p>
          </div>
        </div>
        {analytics?.scoreParts?.length > 0 ? (
          <div className="space-y-1.5 mb-4">
            {analytics.scoreParts.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-stroke">
                <span className="text-xs text-ink2">{p.label}</span>
                <span className={`text-xs font-bold tnum ${p.delta > 0 ? "text-success" : "text-danger"}`}>{p.delta > 0 ? "+" : ""}{p.delta}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted mb-4">No score adjustments yet — add income and more transactions for a complete picture.</p>
        )}
        <div className="text-xs text-muted leading-relaxed space-y-1.5">
          <p><strong className="text-ink2">What's measured:</strong> savings rate (income minus expenses), category balance (food under 20%, shopping under 30% of spend), unusual transactions, subscription load, weekend spending spikes, and active savings or investments.</p>
          <p><strong className="text-ink2">How to improve it:</strong> record your income, confirm expected anomalies below, and keep your top category under a third of total spend.</p>
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="Add Reminder" subtitle="Set due dates to get notified">
        <Input label="Title" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Electricity bill, EMI payment" required />
        <Textarea label="Notes (optional)" value={noteForm.description} onChange={e => setNoteForm(f => ({ ...f, description: e.target.value }))} placeholder="Any extra details" rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Amount (optional)" type="number" value={noteForm.amount} onChange={e => setNoteForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          <Input label="Due Date" type="date" value={noteForm.dueDate} onChange={e => setNoteForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <Select label="Priority" value={noteForm.priority} onChange={e => setNoteForm(f => ({ ...f, priority: e.target.value }))}
          options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
        <Btn onClick={addNote} className="w-full">Save Reminder</Btn>
      </Modal>
    </div>
  );
}
