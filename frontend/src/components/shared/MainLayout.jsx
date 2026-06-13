import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../../context/AppContext";
import DashboardPage    from "../../pages/DashboardPage";
import TransactionsPage from "../../pages/TransactionsPage";
import GoalsPage        from "../../pages/GoalsPage";
import ReportsPage      from "../../pages/ReportsPage";
import SettingsPage     from "../../pages/SettingsPage";
import NotificationBell from "./NotificationBell";
import { Icon } from "./UI";
import toast from "react-hot-toast";

const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: "dashboard" },
  { id: "transactions", label: "Transactions", icon: "transactions" },
  { id: "goals",        label: "Goals",        icon: "target" },
  { id: "reports",      label: "Reports",      icon: "reports" },
  { id: "settings",     label: "Settings",     icon: "settings" },
];

const PAGES = { dashboard: DashboardPage, transactions: TransactionsPage, goals: GoalsPage, reports: ReportsPage, settings: SettingsPage };

function Logo() {
  return (
    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
      </svg>
    </div>
  );
}

export default function MainLayout() {
  const { user, logout, analytics, theme, toggleTheme } = useApp();
  const [page, setPage] = useState("dashboard");
  const [pageParams, setPageParams] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const Page = PAGES[page];

  function navigate(id, params = null) { setPage(id); setPageParams(params); setSideOpen(false); }
  function handleLogout() { logout(); toast.success("Signed out."); }

  const Sidebar = ({ mobile }) => (
    <div className={`flex flex-col h-full ${mobile ? "w-64" : "w-60"} bg-surface border-r border-stroke`}>
      <div className="px-5 py-5 border-b border-stroke">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div>
            <p className="font-bold text-ink text-sm leading-tight tracking-tight">SpendSmart</p>
            <p className="text-[10px] text-muted">Financial Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-faint uppercase tracking-widest px-3 mb-2">Menu</p>
        {NAV.map(n => (
          <button key={n.id} onClick={() => navigate(n.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left border-0 bg-transparent ${page === n.id ? "nav-active" : "nav-inactive"}`}>
            <Icon name={n.icon} size={17} />
            {n.label}
          </button>
        ))}
      </nav>

      {analytics && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-surface2 border border-stroke">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-muted font-medium">Health Score</p>
            <p className="text-sm font-bold tnum text-primary">{analytics.healthScore}<span className="text-muted font-normal text-[11px]">/100</span></p>
          </div>
          <div className="h-1.5 bg-surface3 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${analytics.healthScore}%` }} />
          </div>
        </div>
      )}

      <div className="px-3 pb-4 border-t border-stroke pt-3">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
            <p className="text-[10px] text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-xl text-xs text-muted hover:text-danger hover:bg-surface2 transition-colors flex items-center gap-2 border-0 bg-transparent">
          <Icon name="logout" size={13} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden md:flex flex-col fixed h-full z-10">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {sideOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSideOpen(false)}>
            <motion.div initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", damping: 26 }}
              className="h-full" onClick={e => e.stopPropagation()}>
              <Sidebar mobile />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="h-14 bg-surface border-b border-stroke flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface2 border-0 bg-transparent"
              onClick={() => setSideOpen(true)}>
              <Icon name="menu" size={18} />
            </button>
            <div>
              <h2 className="font-semibold text-ink text-sm capitalize tracking-tight">{page}</h2>
              <p className="text-[11px] text-muted hidden sm:block">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface2 border border-stroke text-ink2 hover:text-ink transition-colors">
              <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
            </button>
            <NotificationBell />
            <button onClick={() => navigate("settings")} title="Profile and settings"
              className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border-0">
              {user?.name?.[0]?.toUpperCase()}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={page}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}>
              <Page onNavigate={navigate} params={pageParams} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
