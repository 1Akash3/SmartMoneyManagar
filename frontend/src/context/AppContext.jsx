import { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import * as api from "../services/api";
import { setCurrency } from "../components/shared/UI";

const AppContext = createContext(null);

export const PERIODS = [
  { key: "1d",  label: "1D",  days: 1 },
  { key: "7d",  label: "7D",  days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "3m",  label: "3M",  months: 3 },
  { key: "6m",  label: "6M",  months: 6 },
  { key: "1y",  label: "1Y",  months: 12 },
  { key: "all", label: "All", months: null },
];

function periodDates(key) {
  const p = PERIODS.find(x => x.key === key);
  if (!p) return {};
  const d = new Date();
  if (p.days != null)        d.setDate(d.getDate() - (p.days - 1)); // inclusive of today (1d => today only)
  else if (p.months != null) d.setMonth(d.getMonth() - p.months);
  else return {};                                                  // "all" — no lower bound
  return { startDate: d.toISOString().slice(0, 10) };
}

const initialTheme = (() => {
  try { return localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
  catch { return "light"; }
})();

const initial = {
  user: JSON.parse(localStorage.getItem("user") || "null"),
  analytics: null,
  transactions: [],
  goals: [],
  notes: [],
  loading: false,
  theme: initialTheme,
  period: "all",
};

// Apply the saved user's currency before first render so amounts format correctly on load.
setCurrency(initial.user?.currency);

function reducer(state, action) {
  switch (action.type) {
    case "SET_USER":         return { ...state, user: action.payload };
    case "SET_ANALYTICS":    return { ...state, analytics: action.payload };
    case "SET_TRANSACTIONS": return { ...state, transactions: action.payload };
    case "SET_GOALS":        return { ...state, goals: action.payload };
    case "SET_NOTES":        return { ...state, notes: action.payload };
    case "SET_LOADING":      return { ...state, loading: action.payload };
    case "SET_THEME":        return { ...state, theme: action.payload };
    case "SET_PERIOD":       return { ...state, period: action.payload };
    case "TXN_ADDED":        return { ...state, transactions: [action.payload, ...state.transactions] };
    case "TXN_UPDATED":      return { ...state, transactions: state.transactions.map(t => (t._id || t.id) === action.id ? action.payload : t) };
    case "TXN_DELETED":      return { ...state, transactions: state.transactions.filter(t => (t._id || t.id) !== action.id) };
    case "LOGOUT":           return { ...initial, user: null, theme: state.theme };
    default:                 return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // Theme: persist + apply class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    try { localStorage.setItem("theme", state.theme); } catch {}
  }, [state.theme]);

  const setTheme = useCallback(t => dispatch({ type: "SET_THEME", payload: t }), []);
  const toggleTheme = useCallback(() => dispatch({ type: "SET_THEME", payload: state.theme === "dark" ? "light" : "dark" }), [state.theme]);

  const setUser = useCallback(user => {
    if (user?.currency) setCurrency(user.currency); // keep formatter in sync (login + profile save)
    dispatch({ type: "SET_USER", payload: user });
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, []);

  const logout = useCallback(() => {
    const theme = localStorage.getItem("theme");
    localStorage.clear();
    if (theme) localStorage.setItem("theme", theme);
    dispatch({ type: "LOGOUT" });
  }, []);

  const fetchAnalytics = useCallback(async (params) => {
    try {
      const { data } = await api.getAnalytics(params);
      dispatch({ type: "SET_ANALYTICS", payload: data });
      return data;
    } catch { return null; }
  }, []);

  const fetchTransactions = useCallback(async (params) => {
    try {
      const { data } = await api.getTransactions(params);
      dispatch({ type: "SET_TRANSACTIONS", payload: data });
      return data;
    } catch { return []; }
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      const { data } = await api.getGoals();
      dispatch({ type: "SET_GOALS", payload: data });
      return data;
    } catch { return []; }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await api.getNotes();
      dispatch({ type: "SET_NOTES", payload: data });
      return data;
    } catch { return []; }
  }, []);

  const refreshAll = useCallback(async (periodKey) => {
    dispatch({ type: "SET_LOADING", payload: true });
    const dates = periodDates(periodKey ?? state.period);
    await Promise.all([fetchAnalytics(dates), fetchTransactions(dates), fetchGoals(), fetchNotes()]);
    dispatch({ type: "SET_LOADING", payload: false });
  }, [fetchAnalytics, fetchTransactions, fetchGoals, fetchNotes, state.period]);

  const setPeriod = useCallback(async (key) => {
    dispatch({ type: "SET_PERIOD", payload: key });
    const dates = periodDates(key);
    await Promise.all([fetchAnalytics(dates), fetchTransactions(dates)]);
  }, [fetchAnalytics, fetchTransactions]);

  /* ── Real-time mutations: server returns fresh analytics with every
        write, so charts update instantly without a full refetch ── */

  const addTransaction = useCallback(async (form) => {
    const { data } = await api.addTransaction(form);
    dispatch({ type: "TXN_ADDED", payload: data.transaction });
    if (data.analytics !== undefined) dispatch({ type: "SET_ANALYTICS", payload: data.analytics });
    return data;
  }, []);

  const editTransaction = useCallback(async (id, form) => {
    const { data } = await api.updateTransaction(id, form);
    dispatch({ type: "TXN_UPDATED", id, payload: data.transaction });
    if (data.analytics !== undefined) dispatch({ type: "SET_ANALYTICS", payload: data.analytics });
    return data;
  }, []);

  const removeTransaction = useCallback(async (id) => {
    const { data } = await api.deleteTransaction(id);
    dispatch({ type: "TXN_DELETED", id });
    if (data.analytics !== undefined) dispatch({ type: "SET_ANALYTICS", payload: data.analytics });
    return data;
  }, []);

  const confirmExpected = useCallback(async (id) => {
    const { data } = await api.confirmExpected(id);
    if (data.analytics !== undefined) dispatch({ type: "SET_ANALYTICS", payload: data.analytics });
    return data;
  }, []);

  const applyAnalytics = useCallback((analytics) => {
    if (analytics !== undefined) dispatch({ type: "SET_ANALYTICS", payload: analytics });
  }, []);

  return (
    <AppContext.Provider value={{
      ...state, dispatch, setUser, logout, setTheme, toggleTheme, setPeriod,
      fetchAnalytics, fetchTransactions, fetchGoals, fetchNotes, refreshAll,
      addTransaction, editTransaction, removeTransaction, confirmExpected, applyAnalytics,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
