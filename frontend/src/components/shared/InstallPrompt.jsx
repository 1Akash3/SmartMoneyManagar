import { useState, useEffect } from "react";
import { Icon } from "./UI";

/**
 * Install helper.
 *  - Android / desktop: shows an "Install" chip via beforeinstallprompt.
 *  - iOS Safari: Apple fires no prompt, so show a manual "Share → Add to
 *    Home Screen" hint instead.
 * Dismissible; hidden once installed (standalone display mode).
 */
export default function InstallPrompt() {
  const [evt, setEvt] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("installDismissed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setEvt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIpadOS = /macintosh/i.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  const isIos = /iphone|ipad|ipod/i.test(ua) || isIpadOS;
  const iosSafari = isIos && !/crios|fxios|edgios/i.test(ua); // exclude Chrome/Firefox/Edge on iOS
  const standalone = typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone);

  const dismiss = () => { try { localStorage.setItem("installDismissed", "1"); } catch {} setDismissed(true); };

  if (dismissed || standalone) return null;

  // Android / desktop — real install prompt available
  if (evt) {
    const install = async () => { evt.prompt(); try { await evt.userChoice; } catch {} setEvt(null); };
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

  // iOS Safari — manual install instructions (Apple gives no auto-prompt)
  if (iosSafari) {
    return (
      <div className="fixed bottom-5 left-5 right-5 sm:right-auto sm:max-w-xs z-40 flex items-start gap-2.5 bg-surface border border-stroke rounded-xl shadow-pop px-3.5 py-3 fade-up">
        <span className="text-primary mt-0.5 flex-shrink-0"><Icon name="download" size={16} /></span>
        <p className="flex-1 text-xs text-ink2 leading-relaxed">
          Install SpendSmart: tap the Share button
          <span className="inline-flex items-center align-middle mx-0.5 text-primary"><Icon name="upload" size={13} /></span>
          in Safari, then <strong className="text-ink">Add to Home Screen</strong>.
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-muted hover:text-ink border-0 bg-transparent flex-shrink-0">
          <Icon name="x" size={14} />
        </button>
      </div>
    );
  }

  return null;
}
