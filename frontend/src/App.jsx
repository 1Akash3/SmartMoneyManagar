import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AppProvider, useApp } from "./context/AppContext";
import AuthPage from "./pages/AuthPage";
import MainLayout from "./components/shared/MainLayout";
import LegalPage from "./pages/LegalPage";
import ContactPage from "./pages/ContactPage";
import CookieConsent from "./components/shared/CookieConsent";
import { initAnalytics } from "./utils/analytics";
import { CoinLoader } from "./components/shared/UI";

function Inner() {
  const { user, setUser, refreshAll } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.clear(); }
    }
    setReady(true);
  }, []);

  useEffect(() => { if (user) refreshAll(); }, [user]);

  if (!ready) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <CoinLoader size={52} />
    </div>
  );

  if (!user) return <AuthPage onAuth={(u) => setUser(u)} />;
  return <MainLayout />;
}

export default function App() {
  useEffect(() => { initAnalytics(); }, []);

  // Public, logged-out-accessible pages (real URLs for SEO + linking).
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (path === "/privacy" || path === "/terms") {
    return (<>
      <LegalPage type={path === "/terms" ? "terms" : "privacy"} />
      <CookieConsent />
    </>);
  }
  if (path === "/contact") {
    return (<>
      <ContactPage />
      <CookieConsent />
    </>);
  }

  return (
    <AppProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--stroke)", fontSize: 13, boxShadow: "var(--shadow-pop)", borderRadius: 12 },
          success: { iconTheme: { primary: "var(--success)", secondary: "var(--surface)" } },
          error:   { iconTheme: { primary: "var(--danger)", secondary: "var(--surface)" } },
        }}
      />
      <Inner />
      <CookieConsent />
    </AppProvider>
  );
}
