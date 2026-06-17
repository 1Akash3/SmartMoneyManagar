import { useState } from "react";
import api from "../../services/api";
import { Icon } from "./UI";

/**
 * App-wide floating AI assistant. A bottom-right bubble that opens a chat
 * panel on any page. Replaces the old in-dashboard assistant card.
 * The bubble carries data-tour="ai" so the onboarding tour can spotlight it.
 */
const SUGGESTIONS = [
  "Where am I overspending?",
  "How much did I pay by cash?",
  "What was my biggest expense?",
  "Did I spend more than last month?",
  "Why is my health score low?",
];

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  async function ask(q) {
    const text = (q || question).trim();
    if (!text || loading) return;
    setQuestion(text);
    setLoading(true);
    setAnswer(null);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // Retry transient failures — the free-tier backend can be waking from sleep.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data } = await api.askAssistant({ question: text });
        setAnswer(data);
        setLoading(false);
        return;
      } catch (err) {
        const s = err.response?.status;
        const transient = !err.response || s === 502 || s === 503 || s === 504;
        if (transient && attempt < 2) {
          setAnswer({ answer: "Waking up the server (free hosting can sleep after a while) — one moment…" });
          await sleep(7000);
          continue;
        }
        setAnswer({ answer: err.response?.data?.error || "Couldn't reach the assistant — the server may still be waking up. Please try again in ~30 seconds." });
        setLoading(false);
        return;
      }
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[min(360px,calc(100vw-2.5rem))] bg-surface border border-stroke rounded-2xl shadow-pop flex flex-col max-h-[70vh] fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stroke">
            <div className="flex items-center gap-2">
              <span className="text-primary"><Icon name="sparkles" size={16} /></span>
              <p className="text-sm font-semibold text-ink">AI Assistant</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 border-0 bg-transparent">
              <Icon name="x" size={15} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto">
            {answer ? (
              <div className="rounded-xl p-3.5 border border-stroke mb-3" style={{ background: "var(--primary-soft)" }}>
                <p className="text-sm text-ink leading-relaxed">{answer.answer}</p>
                {answer.facts?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {answer.facts.map((f, i) => (
                      <span key={i} className="text-xs bg-surface border border-stroke rounded-lg px-2.5 py-1.5">
                        <span className="text-muted">{f.label}</span> <strong className="text-ink tnum">{f.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted mb-3 leading-relaxed">Ask anything about your spending — answered from your own data.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => ask(s)} disabled={loading}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-surface2 border border-stroke text-muted hover:text-ink hover:border-strokeStrong transition-colors disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 p-3 border-t border-stroke">
            <input value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ask()}
              placeholder="Ask about your spending…"
              className="flex-1 bg-surface2 border border-stroke rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-faint" style={{ outline: "none" }} />
            <button onClick={() => ask()} disabled={loading}
              className="px-3.5 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center [.dark_&]:text-[#0b0d13]">
              {loading ? "…" : <Icon name="send" size={15} />}
            </button>
          </div>
        </div>
      )}

      <button data-tour="ai" onClick={() => setOpen(o => !o)} aria-label="AI Assistant" title="AI Assistant"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-pop hover:opacity-90 transition-opacity border-0 [.dark_&]:text-[#0b0d13]">
        <Icon name={open ? "x" : "sparkles"} size={22} />
      </button>
    </>
  );
}
