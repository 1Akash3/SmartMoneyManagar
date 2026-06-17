import { useState, useLayoutEffect } from "react";

/**
 * Guided spotlight tour for new users. Dims the screen and highlights real
 * UI elements (by data-tour attribute) one step at a time. Auto-runs once on
 * a populated dashboard (see MainLayout) and is replayable from Settings.
 */
const STEPS = [
  { sel: '[data-tour="import"]',      title: "Bring in your transactions", body: "Import a CSV, Excel, or PDF bank/UPI statement anytime — your insights update instantly." },
  { sel: '[data-tour="kpis"]',        title: "Your money at a glance",     body: "Spending, income, savings, and a health score that grades your financial habits." },
  { sel: '[data-tour="period"]',      title: "Switch the time period",     body: "View today, the last 7 or 30 days, a few months, or your entire history." },
  { sel: '[data-tour="nav-goals"]',   title: "Set goals & reminders",      body: "Create savings goals and bill reminders so nothing slips through the cracks." },
  { sel: '[data-tour="nav-reports"]', title: "Reports & export",           body: "Email yourself or download a full financial report whenever you need one." },
  { sel: '[data-tour="ai"]',          title: "Ask the AI assistant",       body: "Ask about your spending in plain English. That's it — you're all set!" },
];

export default function OnboardingTour({ onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    const el = document.querySelector(STEPS[i].sel);
    if (!el) { i < STEPS.length - 1 ? setI(i + 1) : onClose(); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const measure = () => setRect(el.getBoundingClientRect());
    const t = setTimeout(measure, 280);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [i]);

  if (!rect) return null;

  const pad = 8;
  const box = { top: rect.top - pad, left: rect.left - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 };
  const vw = window.innerWidth, vh = window.innerHeight;
  const tipW = Math.min(300, vw - 24);
  const placeBelow = box.top + box.h + 180 < vh;
  const tipTop = placeBelow ? box.top + box.h + 12 : Math.max(12, box.top - 168);
  const tipLeft = Math.min(Math.max(12, box.left), vw - tipW - 12);
  const last = i === STEPS.length - 1;

  const btn = { fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <div style={{ position: "fixed", top: box.top, left: box.left, width: box.w, height: box.h, borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)", border: "2px solid var(--primary)", pointerEvents: "none", transition: "all 0.2s ease" }} />
      <div style={{ position: "fixed", top: tipTop, left: tipLeft, width: tipW, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 16, boxShadow: "var(--shadow-pop)", padding: "16px 18px" }}>
        <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, marginBottom: 4 }}>Step {i + 1} of {STEPS.length}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{STEPS[i].title}</div>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 14px" }}>{STEPS[i].body}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 5 }}>
            {STEPS.map((_, k) => (
              <span key={k} style={{ width: 7, height: 7, borderRadius: "50%", background: k === i ? "var(--primary)" : "var(--surface-3)" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ ...btn, padding: "6px 11px", background: "transparent", border: "none", color: "var(--faint)" }}>Skip</button>
            {i > 0 && <button onClick={() => setI(i - 1)} style={{ ...btn, padding: "6px 11px", background: "var(--surface-2)", border: "1px solid var(--stroke)", color: "var(--ink-2)" }}>Back</button>}
            <button onClick={() => (last ? onClose() : setI(i + 1))} style={{ ...btn, background: "var(--primary)", color: "#fff", border: "none", fontWeight: 600 }}>{last ? "Done" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
