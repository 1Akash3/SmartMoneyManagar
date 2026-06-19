import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useApp } from "../../context/AppContext";
import { Icon, fmt } from "./UI";
import * as api from "../../services/api";

export default function NotificationBell() {
  const { notes, fetchNotes } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef();

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function toggle() {
    setOpen(o => {
      if (!o) fetchNotes(); // refresh on open so the bell is always current
      return !o;
    });
  }

  async function markDone(id) {
    setBusy(id);
    try { await api.updateNote(id, { status: "done" }); await fetchNotes(); toast.success("Marked as done."); }
    catch { toast.error("Couldn't update reminder."); }
    finally { setBusy(null); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = notes.filter(n => n.status === "overdue" || (n.dueDate && n.dueDate < today && n.status === "pending"));
  const upcoming = notes.filter(n => {
    if (!n.dueDate || n.status === "done") return false;
    const diff = (new Date(n.dueDate) - new Date()) / 86400000;
    return diff >= 0 && diff <= 3;
  });
  const pendingOther = notes.filter(n =>
    n.status === "pending" &&
    !overdue.includes(n) && !upcoming.includes(n)
  );
  const count = overdue.length + upcoming.length + pendingOther.length;

  const DoneBtn = ({ n }) => (
    <button onClick={() => markDone(n._id || n.id)} disabled={busy === (n._id || n.id)} title="Mark as done"
      className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-success hover:opacity-70 transition-opacity flex-shrink-0 border border-stroke bg-surface disabled:opacity-50">
      <Icon name="check" size={13} />
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface2 border border-stroke text-ink2 hover:text-ink transition-colors relative">
        <Icon name="bell" size={15} />
        {count > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-10 w-80 bg-surface rounded-2xl shadow-pop border border-stroke overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-stroke flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              {count > 0 && <span className="text-[11px] font-semibold text-danger" style={{ background: "var(--danger-soft)", padding: "2px 8px", borderRadius: 6 }}>{count} pending</span>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {count === 0 && (
                <div className="px-4 py-10 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-surface2 flex items-center justify-center text-muted">
                    <Icon name="checkCircle" size={18} />
                  </div>
                  <p className="text-sm text-muted">All clear. No pending reminders.</p>
                </div>
              )}
              {overdue.map(n => (
                <div key={n._id || n.id} className="px-4 py-3 border-b border-stroke flex items-start gap-3" style={{ background: "var(--danger-soft)" }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-danger" style={{ background: "var(--surface)" }}>
                    <Icon name="alertTriangle" size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-danger uppercase tracking-wide mb-0.5">Overdue</p>
                    <p className="text-sm text-ink font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted mt-0.5 tnum">
                      {n.amount > 0 && <span>{fmt(n.amount)} · </span>}was due {n.dueDate}
                    </p>
                  </div>
                  <DoneBtn n={n} />
                </div>
              ))}
              {upcoming.map(n => (
                <div key={n._id || n.id} className="px-4 py-3 border-b border-stroke flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-warning" style={{ background: "var(--warning-soft)" }}>
                    <Icon name="clock" size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-warning uppercase tracking-wide mb-0.5">Due {n.dueDate}</p>
                    <p className="text-sm text-ink font-medium truncate">{n.title}</p>
                    {n.amount > 0 && <p className="text-xs text-muted mt-0.5 tnum">{fmt(n.amount)}</p>}
                  </div>
                  <DoneBtn n={n} />
                </div>
              ))}
              {pendingOther.slice(0, 5).map(n => (
                <div key={n._id || n.id} className="px-4 py-3 border-b border-stroke last:border-0 flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-primary" style={{ background: "var(--primary-soft)" }}>
                    <Icon name="message" size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-0.5">{n.priority} priority{n.dueDate ? "" : " · no due date"}</p>
                    <p className="text-sm text-ink font-medium truncate">{n.title}</p>
                    {n.dueDate && <p className="text-xs text-muted mt-0.5">Due {n.dueDate}</p>}
                  </div>
                  <DoneBtn n={n} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
