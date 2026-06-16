import { useState, useEffect } from "react";

/**
 * Lightweight cookie/analytics consent banner. Stores the choice in
 * localStorage under "cookieConsent" ("accepted" | "declined"). Analytics
 * (GA4) only loads when this is "accepted" — see utils/analytics.js.
 * Dispatches a "cookie-consent" event so analytics can react immediately.
 */
export function getConsent() {
  try { return localStorage.getItem("cookieConsent"); } catch { return null; }
}

export default function CookieConsent() {
  const [choice, setChoice] = useState(() => getConsent());

  useEffect(() => {
    if (!choice) return;
    try { localStorage.setItem("cookieConsent", choice); } catch {}
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: choice }));
  }, [choice]);

  if (choice) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl bg-surface border border-stroke rounded-2xl shadow-pop p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-xs text-ink2 leading-relaxed flex-1">
          We use cookies and analytics to understand how SpendSmart is used and to improve it.
          See our <a href="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</a>.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setChoice("declined")}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted border border-stroke bg-surface hover:bg-surface2 transition-colors">
            Decline
          </button>
          <button onClick={() => setChoice("accepted")}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:opacity-90 transition-opacity [.dark_&]:text-[#0b0d13]">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
