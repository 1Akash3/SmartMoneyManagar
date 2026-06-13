import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { Card, Btn, Modal, Input, Select, EmptyState, ProgressBar, Icon, GOAL_ICONS, fmt } from "../components/shared/UI";
import * as api from "../services/api";

const GOAL_TYPES = [
  { value: "savings",   label: "Savings Goal" },
  { value: "purchase",  label: "Purchase Goal" },
  { value: "emergency", label: "Emergency Fund" },
];
const COLORS = ["#4f46e5", "#059669", "#dc2626", "#d97706", "#ec4899", "#06b6d4", "#10b981", "#a855f7"];
const empty = { title: "", type: "savings", targetAmount: "", savedAmount: "0", deadline: "", icon: "target", color: "#4f46e5" };

/* Legacy goals stored emoji icons; new goals store icon names */
function GoalIcon({ icon, color, size = 18 }) {
  if (GOAL_ICONS.includes(icon)) return <Icon name={icon} size={size} style={{ color }} />;
  return <span style={{ fontSize: size * 0.9 }}>{icon}</span>;
}

export default function GoalsPage() {
  const { goals, fetchGoals } = useApp();
  const [modal, setModal] = useState(false);
  const [depositModal, setDepositModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(empty);
  const [depositAmt, setDepositAmt] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) e.targetAmount = "Enter a valid target amount.";
    else if (parseFloat(form.targetAmount) > 10000000) e.targetAmount = "Target seems unrealistic. Maximum is ₹1 Cr.";
    if (form.savedAmount && parseFloat(form.savedAmount) < 0) e.savedAmount = "Cannot be negative.";
    if (form.savedAmount && parseFloat(form.savedAmount) > parseFloat(form.targetAmount)) e.savedAmount = "Saved cannot exceed target.";
    if (form.deadline && new Date(form.deadline) <= new Date()) e.deadline = "Deadline must be in the future.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.createGoal({ ...form, targetAmount: parseFloat(form.targetAmount), savedAmount: parseFloat(form.savedAmount) || 0 });
      toast.success("Goal created.");
      setModal(false); setForm(empty); fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create goal.");
    } finally { setSaving(false); }
  }

  async function handleDeposit() {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount."); return; }
    try {
      const { data } = await api.depositGoal(depositModal._id || depositModal.id, { amount: amt });
      if (data.goal?.status === "completed") {
        toast.success("Goal completed. Congratulations!", { duration: 4000 });
      } else {
        toast.success(`Added ${fmt(amt)} to "${depositModal.title}".`);
      }
      setDepositModal(null); setDepositAmt(""); fetchGoals();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to add money."); }
  }

  async function handleDelete(g) {
    try {
      await api.deleteGoal(g._id || g.id);
      toast.success("Goal deleted.");
      setDeleteConfirm(null); fetchGoals();
    } catch { toast.error("Failed to delete."); }
  }

  const active = goals.filter(g => g.status === "active");
  const completed = goals.filter(g => g.status === "completed");
  const paused = goals.filter(g => g.status === "paused");
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink tracking-tight">Financial Goals</h2>
          <p className="text-xs text-muted mt-0.5">Track savings, purchases, and emergency funds</p>
        </div>
        <Btn icon="plus" onClick={() => { setForm(empty); setErrors({}); setModal(true); }}>New Goal</Btn>
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Goals", value: goals.length, color: "var(--primary)" },
            { label: "Total Saved", value: fmt(totalSaved), color: "var(--success)" },
            { label: "Remaining", value: fmt(Math.max(totalTarget - totalSaved, 0)), color: "var(--warning)" },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className="text-lg font-bold tnum tracking-tight" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon="target" title="No goals yet"
            sub="Create your first goal — a vacation, an emergency fund, or that gadget you've been eyeing."
            action={<Btn icon="plus" onClick={() => { setForm(empty); setErrors({}); setModal(true); }}>Create First Goal</Btn>} />
        </Card>
      ) : (
        <>
          {[["Active", active], ["Paused", paused], ["Completed", completed]].map(([label, list]) => list.length > 0 && (
            <div key={label}>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">{label}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map(g => (
                  <GoalCard key={g._id || g.id} goal={g}
                    completed={label === "Completed"} paused={label === "Paused"}
                    onDeposit={() => { setDepositModal(g); setDepositAmt(""); }}
                    onDelete={() => setDeleteConfirm(g)}
                    onPause={async () => { await api.updateGoal(g._id || g.id, { status: "paused" }); fetchGoals(); toast("Goal paused."); }}
                    onResume={async () => { await api.updateGoal(g._id || g.id, { status: "active" }); fetchGoals(); toast.success("Goal resumed."); }} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Create Goal" subtitle="Set a target and track your progress" size="lg">
        <Input label="Goal Title" value={form.title} onChange={set("title")} placeholder="e.g. MacBook Air, Goa Trip, Emergency Fund" error={errors.title} required />
        <Select label="Goal Type" value={form.type} onChange={set("type")} options={GOAL_TYPES} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Target Amount" type="number" value={form.targetAmount} onChange={set("targetAmount")} placeholder="100000" error={errors.targetAmount} required />
          <Input label="Already Saved" type="number" value={form.savedAmount} onChange={set("savedAmount")} placeholder="0" error={errors.savedAmount} />
        </div>
        <Input label="Target Deadline (optional)" type="date" value={form.deadline} onChange={set("deadline")} error={errors.deadline} />

        <div className="mb-3">
          <label className="block text-xs font-medium text-ink2 mb-2">Icon</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map(ic => (
              <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border ${form.icon === ic ? "border-transparent" : "border-stroke bg-surface2 text-muted hover:text-ink"}`}
                style={form.icon === ic ? { background: form.color, color: "#fff" } : {}}>
                <Icon name={ic} size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-ink2 mb-2">Accent Color</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-7 h-7 rounded-full transition-transform"
                style={{ background: c, border: form.color === c ? "3px solid var(--ink)" : "3px solid transparent", transform: form.color === c ? "scale(1.1)" : "none" }} />
            ))}
          </div>
        </div>

        <Btn onClick={handleCreate} disabled={saving} className="w-full" icon="target">
          {saving ? "Creating…" : "Create Goal"}
        </Btn>
      </Modal>

      {/* Deposit Modal */}
      <Modal open={!!depositModal} onClose={() => { setDepositModal(null); setDepositAmt(""); }}
        title="Add Money to Goal" subtitle={depositModal?.title} size="sm">
        {depositModal && (
          <>
            <div className="mb-4 p-4 rounded-xl bg-surface2 border border-stroke text-center">
              <p className="text-2xl font-bold tnum tracking-tight" style={{ color: depositModal.color }}>
                {fmt(depositModal.savedAmount)} <span className="text-sm text-muted font-normal">of {fmt(depositModal.targetAmount)}</span>
              </p>
              <div className="my-2">
                <ProgressBar value={depositModal.savedAmount} max={depositModal.targetAmount} color={depositModal.color} height={6} />
              </div>
              <p className="text-xs text-muted tnum">{Math.round(depositModal.savedAmount / depositModal.targetAmount * 100)}% complete · {fmt(Math.max(depositModal.targetAmount - depositModal.savedAmount, 0))} remaining</p>
            </div>
            <Input label="Amount to Add" type="number" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="Enter amount" />
            <Btn onClick={handleDeposit} className="w-full" icon="plus">Add to Goal</Btn>
          </>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Goal?" size="sm">
        {deleteConfirm && (
          <>
            <p className="text-sm text-ink2 mb-4 leading-relaxed">
              Delete <strong className="text-ink">{deleteConfirm.title}</strong>?
              You've saved {fmt(deleteConfirm.savedAmount)} towards it. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Btn variant="danger" onClick={() => handleDelete(deleteConfirm)} className="flex-1" icon="trash">Delete Goal</Btn>
              <Btn variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function GoalCard({ goal, onDeposit, onDelete, onPause, onResume, completed, paused }) {
  const pct = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);

  // Monthly requirement to hit the deadline
  const monthlyReq = goal.deadline && !completed ? (() => {
    const months = Math.max((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30.44), 0.25);
    return Math.ceil(remaining / months);
  })() : null;

  // Estimated completion based on contribution pace since creation
  const eta = !completed && goal.savedAmount > 0 && remaining > 0 && goal.createdAt ? (() => {
    const monthsActive = Math.max((Date.now() - new Date(goal.createdAt)) / (1000 * 60 * 60 * 24 * 30.44), 0.25);
    const pace = goal.savedAmount / monthsActive;
    if (pace <= 0) return null;
    const monthsLeft = Math.ceil(remaining / pace);
    if (monthsLeft > 120) return null;
    const d = new Date(); d.setMonth(d.getMonth() + monthsLeft);
    return { monthsLeft, label: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }) };
  })() : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5" hover>
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${goal.color} 12%, transparent)` }}>
              <GoalIcon icon={goal.icon} color={goal.color} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate">{goal.title}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: goal.color }}>{goal.type} goal</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {!completed && <Btn size="xs" onClick={onDeposit} icon="plus">Add</Btn>}
            {!completed && !paused && onPause && <Btn size="xs" variant="secondary" icon="pause" onClick={onPause} />}
            {paused && onResume && <Btn size="xs" variant="success" icon="play" onClick={onResume}>Resume</Btn>}
            <Btn size="xs" variant="danger" icon="trash" onClick={onDelete} />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted tnum">{fmt(goal.savedAmount)} saved</span>
            <span className="font-bold tnum" style={{ color: goal.color }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-surface3">
            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ background: completed ? "var(--success)" : goal.color }} />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-muted">Target <strong className="text-ink tnum">{fmt(goal.targetAmount)}</strong></span>
          {completed ? (
            <span className="text-success font-semibold inline-flex items-center gap-1"><Icon name="checkCircle" size={12} /> Achieved</span>
          ) : (
            <span className="text-muted">Left <strong className="text-warning tnum">{fmt(remaining)}</strong></span>
          )}
        </div>

        {(monthlyReq || eta) && (
          <div className="mt-3 p-3 rounded-xl text-xs space-y-1 border border-stroke bg-surface2">
            {monthlyReq && (
              <p className="text-ink2">Save <strong className="tnum" style={{ color: goal.color }}>{fmt(monthlyReq)}/month</strong> to reach this by {goal.deadline}</p>
            )}
            {eta && (
              <p className="text-muted">At your current pace, complete by <strong className="text-ink">{eta.label}</strong> (~{eta.monthsLeft} months)</p>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
