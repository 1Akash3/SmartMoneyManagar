import { useState, useEffect } from "react";
import { Icon } from "./UI";

/**
 * "Install app" chip. Appears (bottom-left) when the browser fires
 * beforeinstallprompt — i.e. the PWA is installable and not yet installed.
 * Dismissible; hidden once installed (standalone display mode).
 */
export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("installDismissed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setEvt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const standalone = typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone);
  if (!evt || hidden || standalone) return null;

  const install = async () => {
    evt.prompt();
    try { await evt.userChoice; } catch {}
    setEvt(null);
  };
  const dismiss = () => { try { localStorage.setItem("installDismissed", "1"); } catch {} setHidden(true); };

  return (
    <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5 bg-surface border border-stroke rounded-xl shadow-pop px-3 py-2.5 fade-up">
      <span className="text-primary"><Icon name="download" size={16} /></span>
      <span className="text-xs text-ink2 font-medium">Install SpendSmart</span>
      <button onClick={install}
        className="text-xs font-semibold text-white bg-primary rounded-lg px-3 py-1.5 border-0 hover:opacity-90 transition-opacity [.dark_&]:text-[#0b0d13]">
        Install
      </button>
      <button onClick={dismiss} aria-label="Dismiss" className="text-muted hover:text-ink border-0 bg-transparent">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
