import { useState } from "react";
import api from "../services/api";

/**
 * Public contact / support / bug-report page at /contact. Posts to the
 * /api/email/feedback endpoint (no auth required) which emails support.
 * Self-contained — does not depend on app context or toast.
 */
const initialType = (() => {
  try {
    const t = new URLSearchParams(window.location.search).get("type");
    return ["bug", "feedback", "support"].includes(t) ? t : "support";
  } catch { return "support"; }
})();

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", type: initialType, message: "" });
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.message.trim()) return setError("Please fill in your name and message.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Please enter a valid email address.");
    setStatus("sending");
    try {
      await api.post("/email/feedback", form);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.error || "Couldn't send right now. Please try again.");
    }
  }

  const inputCls = "w-full bg-surface2 border border-stroke rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-faint";

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-stroke bg-surface">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
            </div>
            <span className="font-bold tracking-tight">SpendSmart</span>
          </a>
          <a href="/" className="text-xs text-primary font-medium hover:underline">← Back to app</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Contact &amp; Support</h1>
        <p className="text-sm text-muted mb-7">Have a question, feedback, or found a bug? Send us a message and we'll get back to you.</p>

        {status === "sent" ? (
          <div className="rounded-2xl border border-stroke p-6 text-center" style={{ background: "var(--success-soft)" }}>
            <p className="text-sm font-semibold text-success mb-1">Message sent</p>
            <p className="text-xs text-ink2">Thanks for reaching out — we'll reply to <strong>{form.email}</strong> soon.</p>
            <a href="/" className="inline-block mt-4 text-xs text-primary font-semibold hover:underline">Return to app</a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">Type</label>
              <select value={form.type} onChange={set("type")} className={inputCls + " cursor-pointer"} style={{ outline: "none" }}>
                <option value="support">Support / question</option>
                <option value="bug">Bug report</option>
                <option value="feedback">General feedback</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">Your name</label>
              <input value={form.name} onChange={set("name")} placeholder="Your name" className={inputCls} style={{ outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">Your email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} style={{ outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1.5">
                {form.type === "bug" ? "What went wrong? (steps, what you expected)" : "Message"}
              </label>
              <textarea value={form.message} onChange={set("message")} rows={5}
                placeholder={form.type === "bug" ? "Describe the bug and how to reproduce it…" : "How can we help?"}
                className={inputCls + " resize-none"} style={{ outline: "none" }} />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <button type="submit" disabled={status === "sending"}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition-opacity disabled:opacity-60 [.dark_&]:text-[#0b0d13]">
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}

        <footer className="mt-10 pt-5 border-t border-stroke flex gap-4 text-xs text-faint">
          <a href="/privacy" className="hover:text-primary">Privacy</a>
          <a href="/terms" className="hover:text-primary">Terms</a>
        </footer>
      </main>
    </div>
  );
}
