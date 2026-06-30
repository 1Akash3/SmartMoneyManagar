# 💸 SpendSmart — AI-Powered Financial Intelligence Platform

> A full-stack fintech analytics platform that turns raw bank statements (CSV / XLSX / **PDF**) into real-time spending insights, an AI financial assistant, savings goals, and emailed PDF reports — wrapped in an installable PWA.

<p align="left">
  <img alt="React" src="https://img.shields.io/badge/React_18-20232A?logo=react&logoColor=61DAFB" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite_5-646CFF?logo=vite&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB_Atlas-47A248?logo=mongodb&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Anthropic" src="https://img.shields.io/badge/Claude_AI-D97757?logo=anthropic&logoColor=white" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white" />
</p>

### 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Framer Motion, Recharts, React Hot Toast, vite-plugin-pwa, Capacitor (Android) |
| **Backend** | Node.js, Express, Mongoose, JWT (access + refresh), bcrypt, Helmet, express-rate-limit, express-mongo-sanitize |
| **Data / AI** | MongoDB Atlas (in-memory fallback), Anthropic Claude (AI assistant + rule-based fallback), PapaParse, xlsx, pdf-parse |
| **Integrations** | Cloudflare Turnstile (captcha), Brevo SMTP (email + reports), node-cron keep-alive |

> 🎓 **Portfolio note:** Built solo as a production-style fintech app. Highlights: a CSV/XLSX/**PDF** ingestion pipeline, a real analytics engine (health score, outlier detection, spend prediction), security hardening (NoSQL-injection blocking, rate limiting, captcha), and graceful degradation everywhere (DB→in-memory, email→PDF, captcha→pass).

---

## 🚀 HOW TO RUN

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm start          # → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

Open **http://localhost:5173**

---

## ⚙️ CONFIGURATION STATUS

| Service | Status | Notes |
|---|---|---|
| MongoDB Atlas | ✅ Configured | URI in `backend/.env`. **Add your IP in Atlas → Network Access** (or 0.0.0.0/0 for dev) or it falls back to in-memory |
| JWT + Refresh Tokens | ✅ Configured | 15m access / 7d refresh, 30d with Remember Me |
| Cloudflare Turnstile | ⚠️ One step left | Secret key is set in backend. **Put your SITE key in `frontend/.env`** (`VITE_TURNSTILE_SITE_KEY`). Get it: Cloudflare Dashboard → Turnstile → your widget. Currently a test key that always passes |
| Brevo SMTP Email | ✅ Configured | Password reset + financial reports send via smtp-relay.brevo.com |
| Guest Login | ✅ Works | guest@spendsmart.com / guest123 (bypasses captcha) |

---

## ✅ COMPLETE FEATURE RECORD (everything per spec)

### Authentication
- [x] Signup with validation + password strength meter
- [x] Login with Remember Me (30d token)
- [x] Logout
- [x] Forgot Password → Brevo email with reset link (1h expiry)
- [x] Reset Password
- [x] JWT access tokens (15m) + refresh tokens (7d) with auto-refresh interceptor
- [x] Session expiry handling (graceful redirect, no crashes)
- [x] bcrypt hashing (12 rounds) — passwords never stored in plain text
- [x] Cloudflare Turnstile captcha on signup/login
- [x] Rate limiting on auth routes (20 req / 15 min)
- [x] Guest login for demos

### Statement Upload
- [x] CSV, XLSX, XLS, **PDF** support
- [x] Upload **preview before final import** (shows first 10 rows + issue counts)
- [x] Pipeline: upload → extraction → parsing → merchant detection → category classification → storage → analytics
- [x] PDF: date/amount/merchant extraction from statement text
- [x] Handles DD/MM/YYYY, MM/DD/YYYY, ISO dates, Excel serial dates
- [x] Detects: duplicates, missing values, negative amounts, future dates, zero amounts, corrupted files, empty files, wrong formats

### Transaction Management
- [x] Income / Expense / Transfer / Saving types
- [x] Manual entry, edit, delete (with confirm dialog)
- [x] Recurring flag
- [x] Search + filter (category, type, date range) + sort + pagination
- [x] Merchant avatars (icon or colored initials fallback)

### Analytics (all real-time, no refresh needed)
- [x] Total spending, income, net savings, cash flow, savings rate
- [x] Daily / weekly / monthly trends
- [x] Category + merchant breakdown
- [x] Subscription cost + Subscription Center (monthly/annual)
- [x] Financial Health Score (0–100)
- [x] Next-month spend prediction
- [x] Z-score outlier detection with severity warnings
- [x] Weekend vs weekday analysis
- [x] EDA report: mean, median, max, min, recurring detection

### Goals & Savings
- [x] Savings / Purchase / Emergency fund types
- [x] Monthly requirement calculation from deadline
- [x] Progress bars, deposit money, pause/resume, complete celebration
- [x] Icons + accent color picker

### Notes & Reminders
- [x] Title, description, amount, due date, priority, status
- [x] Global notification bell 🔔 with count — visible on every page
- [x] Panel shows: overdue payments, due-soon (3 days), pending notes
- [x] Auto-overdue detection
- [x] Integrated in Dashboard (no separate page, per spec)

### Dashboard (single hub, per spec)
- [x] KPI cards, charts (pie/bar/line via Recharts)
- [x] Income vs Expense comparison
- [x] What-If Simulator as dashboard widget (merged per spec)
- [x] Personalized recommendations (9 priorities + custom goal)
- [x] Top merchants, subscriptions, outliers, alerts
- [x] Upload with preview modal

### Reports
- [x] 4 tabs: Overview / EDA / Goals / Export
- [x] Health score ring visualization
- [x] **PDF download** (professional print layout) — works even if email fails
- [x] **Email report** via Brevo with graceful fallback

### Settings
- [x] Profile edit, monthly budget with usage bar, currency
- [x] Change password with validation
- [x] Data overview, About section

### Error Handling (all 25 negative cases addressed)
- [x] New user empty states everywhere
- [x] Toast notifications for every action (success/error/info)
- [x] Field-level form validation with inline errors
- [x] Unrealistic goal rejection (>₹1 Cr)
- [x] Budget exceeded warnings
- [x] Global error handler — no white screens, no crashes
- [x] DB failure → in-memory fallback; email failure → PDF fallback; captcha network failure → graceful pass

### Architecture
- [x] REST APIs → mobile-app ready (React Native/Flutter can consume same endpoints)
- [x] Centralized state (Context API + reducer)
- [x] Data Access Layer works identically with MongoDB or in-memory
- [x] helmet security headers + CORS locked to client URL

### Per spec — removed/merged
- [x] No separate Simulator page (dashboard widget)
- [x] No separate Notes page (dashboard + bell)
- [x] No daily challenge system

---

## 📁 STRUCTURE

```
backend/
├── server.js               ← run this
├── .env                    ← all credentials
├── config/db.js            ← Mongo + in-memory fallback
├── middleware/auth.js      ← JWT verify
├── middleware/turnstile.js ← Cloudflare captcha verify
├── models/                 ← User, Transaction, Goal, Note
├── routes/                 ← auth, transactions, goals, notes, email
└── utils/                  ← parser (CSV/XLSX/PDF), analytics, dal, mailer

frontend/
├── .env                    ← VITE_TURNSTILE_SITE_KEY (add yours!)
└── src/
    ├── App.jsx · context/AppContext.jsx · services/api.js
    ├── pages/              ← Auth, Dashboard, Transactions, Goals, Reports, Settings
    └── components/shared/  ← MainLayout, NotificationBell, UI kit, Charts
```

## 🔒 SECURITY NOTE
The credentials in `.env` were shared during development. Before any public deployment:
rotate the MongoDB password, Brevo SMTP key, and JWT secrets.

## ✔️ VERIFIED
- All 17 backend files pass `node --check`
- Live API test passed: signup→login→transaction→analytics→goal→note
- Frontend `vite build` passes clean
- Turnstile blocks requests without captcha token ✓
