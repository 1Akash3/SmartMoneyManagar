/**
 * Google Analytics 4 — consent-gated. GA loads only after the user accepts
 * the cookie banner (or has previously accepted). Set the measurement ID in
 * the Vercel env var VITE_GA_MEASUREMENT_ID (e.g. "G-XXXXXXXXXX").
 */
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
let loaded = false;

function consentGranted() {
  try { return localStorage.getItem("cookieConsent") === "accepted"; } catch { return false; }
}

function loadGtag() {
  if (loaded || !GA_ID) return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: true });
}

export function initAnalytics() {
  if (!GA_ID) return;
  if (consentGranted()) loadGtag();
  // Load immediately when the user accepts via the cookie banner.
  window.addEventListener("cookie-consent", e => {
    if (e.detail === "accepted") loadGtag();
  });
}

// Page view for SPA navigations (the initial load is tracked automatically).
export function trackPage(path) {
  if (!loaded || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path || window.location.pathname });
}

// Custom user events, e.g. trackEvent("login", { method: "password" }).
export function trackEvent(name, params = {}) {
  if (!loaded || !window.gtag) return;
  window.gtag("event", name, params);
}
