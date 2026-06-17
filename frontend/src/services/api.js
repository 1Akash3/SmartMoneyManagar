import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("accessToken");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

function forceRelogin() {
  const theme = localStorage.getItem("theme");
  localStorage.clear();
  if (theme) localStorage.setItem("theme", theme); // keep the user's theme choice
  window.location.href = "/";
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const code = err.response?.data?.code;
    if (err.response?.status === 401 && code === "TOKEN_EXPIRED" && !original._retry) {
      original._retry = true;
      try {
        const rt = localStorage.getItem("refreshToken");
        const { data } = await axios.post("/api/auth/refresh", { refreshToken: rt });
        localStorage.setItem("accessToken", data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        // Only sign out if the refresh token itself was rejected (401). A network
        // blip or a cold-starting server must NOT destroy the session.
        if (refreshErr.response?.status === 401) {
          forceRelogin();
          return new Promise(() => {}); // halt while the page redirects
        }
        return Promise.reject(refreshErr); // transient — keep the user logged in
      }
    }
    // Token rejected outright (no token, or invalid signature after a JWT secret
    // rotation) → clear the stale session and send the user to a fresh login.
    if (err.response?.status === 401 && (code === "TOKEN_INVALID" || code === "NO_TOKEN")) {
      forceRelogin();
      return new Promise(() => {});
    }
    return Promise.reject(err);
  }
);

// Auth
export const signup         = d        => api.post("/auth/signup", d);
export const verifyEmail    = d        => api.post("/auth/verify-email", d);
export const resendOtp      = d        => api.post("/auth/resend-otp", d);
export const login          = d        => api.post("/auth/login", d);
export const refreshToken   = rt       => api.post("/auth/refresh", { refreshToken: rt });
export const getMe          = ()       => api.get("/auth/me");
export const updateProfile  = d        => api.put("/auth/profile", d);
export const changePassword = d        => api.put("/auth/password", d);
export const forgotPassword = d        => api.post("/auth/forgot-password", d);
export const resetPassword  = d        => api.post("/auth/reset-password", d);

// Transactions
export const getTransactions     = p        => api.get("/transactions", { params: p });
export const getAnalytics        = p        => api.get("/transactions/analytics", { params: p });
export const uploadFile          = form     => api.post("/transactions/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
export const previewFile         = form     => api.post("/transactions/preview", form, { headers: { "Content-Type": "multipart/form-data" } });
export const confirmImport       = d        => api.post("/transactions/confirm-import", d);
export const addTransaction      = d        => api.post("/transactions", d);
export const updateTransaction   = (id, d)  => api.put(`/transactions/${id}`, d);
export const deleteTransaction   = id       => api.delete(`/transactions/${id}`);
export const confirmExpected     = id       => api.post(`/transactions/${id}/confirm-expected`);
export const getRecommendations  = d        => api.post("/transactions/recommendations", d);
export const getImports          = ()       => api.get("/transactions/imports");
export const deleteImport        = id       => api.delete(`/transactions/imports/${id}`);
export const loadSample          = ()       => api.post("/transactions/load-sample");
export const clearSample         = ()       => api.delete("/transactions/imports/sample");

// AI Assistant
export const askAssistant = d => api.post("/ai/ask", d);

// Goals
export const getGoals    = ()         => api.get("/goals");
export const createGoal  = d          => api.post("/goals", d);
export const updateGoal  = (id, d)    => api.put(`/goals/${id}`, d);
export const depositGoal = (id, d)    => api.post(`/goals/${id}/deposit`, d);
export const deleteGoal  = id         => api.delete(`/goals/${id}`);

// Notes
export const getNotes    = ()         => api.get("/notes");
export const createNote  = d          => api.post("/notes", d);
export const updateNote  = (id, d)    => api.put(`/notes/${id}`, d);
export const deleteNote  = id         => api.delete(`/notes/${id}`);

// Email
export const sendReport  = d          => api.post("/email/report", d);

export default api;
