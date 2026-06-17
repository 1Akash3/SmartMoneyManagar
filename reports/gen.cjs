const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  LevelFormat, TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, Footer, PageNumber,
} = require("docx");

const CW = 9360;              // content width (US Letter, 1" margins)
const ACCENT = "4F46E5";      // brand indigo
const LIGHT = "EEF0FB";
const GREY = "6B6F86";

/* ---------- helpers ---------- */
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

function runs(parts) {
  if (typeof parts === "string") return [new TextRun(parts)];
  return parts.map(p => typeof p === "string"
    ? new TextRun(p)
    : new TextRun({ text: p.t, bold: !!p.b, italics: !!p.i, color: p.c }));
}
const P = (parts, opts = {}) => new Paragraph({ spacing: { after: 130 }, children: runs(parts), ...opts });
const lead = parts => new Paragraph({ spacing: { after: 140 }, children: runs(parts) });
const bullet = parts => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 60 }, children: runs(parts) });
const numbered = parts => new Paragraph({ numbering: { reference: "num", level: 0 }, spacing: { after: 60 }, children: runs(parts) });
const space = () => new Paragraph({ children: [new TextRun("")] });
const pb = () => new Paragraph({ children: [new PageBreak()] });

function cell(content, { bold = false, fill, w } = {}) {
  const bd = { style: BorderStyle.SINGLE, size: 1, color: "D5D7E3" };
  const kids = Array.isArray(content)
    ? content.map(line => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: line, bold })] }))
    : [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: String(content), bold })] })];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: { top: bd, bottom: bd, left: bd, right: bd },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: kids,
  });
}
function table(headers, rows, widths) {
  const tw = widths.reduce((a, b) => a + b, 0);
  const head = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { bold: true, fill: LIGHT, w: widths[i] })) });
  const body = rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i] })) }));
  return new Table({ width: { size: tw, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] });
}
function figure(caption) {
  const dash = { style: BorderStyle.DASHED, size: 1, color: ACCENT };
  return new Paragraph({
    spacing: { before: 100, after: 180 },
    alignment: AlignmentType.CENTER,
    border: { top: dash, bottom: dash, left: dash, right: dash },
    shading: { fill: "FAFBFF", type: ShadingType.CLEAR },
    children: [new TextRun({ text: "  [ Screenshot — " + caption + " ]  ", italics: true, color: GREY })],
  });
}

function buildDoc(footerTitle, children) {
  return new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Arial", color: "1F2247" }, paragraph: { spacing: { before: 300, after: 140 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 25, bold: true, font: "Arial", color: ACCENT }, paragraph: { spacing: { before: 220, after: 90 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 23, bold: true, font: "Arial", color: "2A2D52" }, paragraph: { spacing: { before: 150, after: 70 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
        { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: footerTitle + "   •   Page ", size: 17, color: "9098B0" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "9098B0" }),
      ] })] }) },
      children,
    }],
  });
}

function titlePage(title, subtitle, tag) {
  return [
    new Paragraph({ spacing: { before: 1700, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SpendSmart", bold: true, size: 66, color: ACCENT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "AI-Powered Personal Finance Platform", size: 24, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 10 } }, children: [new TextRun("")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 420, after: 70 }, children: [new TextRun({ text: title, bold: true, size: 38 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: subtitle, size: 23, italics: true, color: "4A4F6A" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700 }, children: [new TextRun({ text: tag, size: 19, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "Live app:  smart-money-managar-xdti-one.vercel.app", size: 18, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Code:  github.com/1Akash3/SmartMoneyManagar", size: 18, color: GREY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50 }, children: [new TextRun({ text: "Prepared " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), size: 17, color: "9098B0" })] }),
    pb(),
  ];
}
function toc() {
  return [
    new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: "Contents", bold: true, size: 30, color: "1F2247" })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "(In Word: right-click the list below → Update Field to fill in page numbers.)", italics: true, size: 18, color: GREY })] }),
    new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
    pb(),
  ];
}

/* ============================================================ */
/* REPORT 1 — PROJECT REPORT                                    */
/* ============================================================ */
const r1 = [
  ...titlePage("Project Report", "Design, Architecture & Features of an AI-Powered Expense Tracker", "Full-Stack Web Application — React, Node.js, MongoDB"),
  ...toc(),

  H1("1. Abstract"),
  lead("SpendSmart is a full-stack personal-finance web application that helps people understand and improve how they spend. Instead of asking users to link their bank accounts, it lets them import their existing bank or UPI statements (CSV, Excel, or PDF) or add transactions manually, then turns that raw data into clear, visual insight: category breakdowns, cash-flow trends, a budget that carries unspent money forward, a 0–100 financial health score, automatically flagged unusual transactions, and a private AI assistant that answers questions about their own spending in plain English."),
  lead("The application is built with a React front end, a Node.js/Express REST API, and a MongoDB database, and is deployed as a Progressive Web App (PWA) that can be installed on Android, iPhone, and desktop — with the same codebase also packaged for the app stores using Capacitor. This report documents the technology stack, system architecture, data model, feature set, the “intelligence” layer, security measures, deployment approach, and how SpendSmart differs from existing expense trackers."),

  H1("2. Introduction"),
  P("Most people do not lack financial data — it is scattered across bank statements, UPI apps, and SMS alerts. What they lack is a single, easy-to-read picture of where their money goes and what to do about it. Existing expense apps often solve this by requesting intrusive permissions (reading SMS, or linking directly to bank accounts), which raises real privacy concerns and, on modern app stores, is increasingly restricted."),
  P("SpendSmart takes a deliberately privacy-friendly approach. The user stays in control of their data: they upload a statement or type a transaction, and everything is analysed on the server that belongs to the app — never sold, and never sent to a third-party AI. The result is a tool that feels like a smart financial dashboard, but without the trust trade-offs of bank-linking apps."),

  H1("3. Objectives"),
  bullet("Give users a single, visual view of spending, income, savings, and financial health."),
  bullet("Make data entry effortless — import CSV / Excel / PDF statements, or add transactions manually."),
  bullet("Turn raw transactions into insight: trends, budgets, anomalies, subscriptions, and forecasts."),
  bullet("Provide a natural-language assistant that answers questions from the user’s own data, privately."),
  bullet("Be accessible everywhere — installable on phone and desktop — without forcing an app-store download."),
  bullet("Protect user data with proper authentication, hashing, and privacy controls."),

  H1("4. Technology Stack"),
  P("SpendSmart is a classic three-tier application. Each layer uses well-supported, industry-standard tools:"),
  table(
    ["Layer", "Technology", "Why it was chosen"],
    [
      ["Front end", "React 18 + Vite", "Fast, component-based UI with instant dev builds."],
      ["Styling", "Tailwind CSS", "Consistent, responsive design without large CSS files."],
      ["Charts / motion", "Recharts, Framer Motion", "Interactive charts and smooth animations."],
      ["API", "Node.js + Express", "Lightweight, widely-used REST API framework."],
      ["Database", "MongoDB (Mongoose) Atlas", "Flexible document store; cloud-hosted, free tier."],
      ["Auth", "JWT + bcrypt", "Stateless tokens; passwords stored only as secure hashes."],
      ["Email", "Brevo (HTTP API)", "Transactional email for verification & reports."],
      ["Bot protection", "Cloudflare Turnstile", "CAPTCHA on signup/login without tracking users."],
      ["File import", "Multer + CSV/XLSX/PDF parsers", "Reads bank/UPI statements into transactions."],
      ["Analytics", "Google Analytics 4 (consent-gated)", "Usage insight, loaded only after consent."],
      ["Market data", "Twelve Data API (cached)", "Live gold, USD/INR, and crypto prices."],
      ["Packaging", "PWA (vite-plugin-pwa) + Capacitor", "Installable web app + app-store builds."],
      ["Hosting", "Vercel + Render + MongoDB Atlas", "Front end, API, and database respectively."],
    ],
    [1900, 3100, 4360]
  ),

  H1("5. System Architecture"),
  P("The app follows a three-tier client–server design. The browser (or installed app) runs the React front end; it talks to the Express API over HTTPS; the API reads and writes the MongoDB database."),
  figure("system architecture diagram (Browser/PWA → Vercel → Render API → MongoDB Atlas, with Brevo, Turnstile, Twelve Data on the side)"),
  P([{ t: "Single-origin trick: ", b: true }, "The front end is hosted on Vercel and the API on Render (two different servers). To make them behave as one site, Vercel is configured to forward every /api request to the Render backend. From the browser’s point of view, there is only one address — which avoids cross-origin (CORS) problems and keeps the code simple."]),
  P([{ t: "Email over HTTPS: ", b: true }, "The hosting provider blocks the traditional email (SMTP) ports, so SpendSmart sends email through Brevo’s HTTPS API instead — a small but important design decision that makes verification and report emails reliable in the cloud."]),
  P([{ t: "Cached market data: ", b: true }, "Live prices are fetched on the server and cached for 10 minutes, so the app stays within the free data-provider limits no matter how many users view the dashboard."]),

  H1("6. Data Model"),
  P("Data is stored in four MongoDB collections. Computed insight (trends, health score, anomalies) is generated on demand from the transactions — it is not stored, so it is always up to date."),
  H3("6.1 Users"),
  table(["Field", "Type", "Purpose"], [
    ["name, email", "String", "Identity (email is unique)."],
    ["password", "String (bcrypt hash)", "Never stored in plain text or recoverable."],
    ["isVerified, verifyOtp", "Boolean / String", "Email verification via 6-digit code."],
    ["resetToken, refreshToken", "String", "Password reset and session refresh."],
    ["currency, monthlyBudget", "String / Number", "User preferences."],
  ], [2600, 2600, 4160]),
  H3("6.2 Transactions"),
  table(["Field", "Type", "Purpose"], [
    ["userId", "ObjectId (ref User)", "Owner of the transaction."],
    ["date, merchant, amount", "String / Number", "The core of every transaction."],
    ["category, type", "String", "e.g. Food; expense / income / saving."],
    ["paymentMethod, city, notes", "String", "Optional context."],
    ["isOutlier, isRecurring", "Boolean", "Set by the anomaly & subscription logic."],
    ["source, importId", "String", "manual vs upload; groups an imported batch."],
  ], [2600, 2400, 4360]),
  H3("6.3 Goals & 6.4 Notes (Reminders)"),
  table(["Collection", "Key fields", "Purpose"], [
    ["Goals", "title, targetAmount, savedAmount, deadline, status", "Savings goals with progress and deposits."],
    ["Notes", "title, amount, dueDate, priority, status", "Bill / payment reminders, with overdue detection."],
  ], [1900, 4060, 3400]),

  H1("7. Core Features"),
  H2("7.1 Accounts & Security"),
  bullet("Sign up with email + password, confirmed by a 6-digit code emailed to the user."),
  bullet("Log in with short-lived access tokens and a refresh token (so sessions stay smooth but secure)."),
  bullet("“Continue as Guest” demo mode, password reset by email, and a CAPTCHA to block bots."),
  figure("Login / Sign-up screen (with the CAPTCHA and ‘Continue as Guest’)"),
  H2("7.2 Dashboard"),
  bullet("KPI cards: Total Spent, Income, Net Savings, and a Financial Health Score."),
  bullet("Budget tracker with month-to-month carry-forward (unspent money rolls over)."),
  bullet("Time filter: Today, 7D, 30D, 3M, 6M, 1Y, or All — every chart updates live."),
  bullet("Charts: category breakdown, cash flow, weekly and daily trends; plus a live market ticker."),
  figure("Dashboard with sample data (KPIs, charts, market ticker)"),
  H2("7.3 Transactions & Statement Import"),
  bullet("Add, edit, delete, search, and filter transactions."),
  bullet("Import CSV / Excel / PDF statements with a preview and automatic duplicate detection."),
  figure("Statement import preview (rows detected, duplicates flagged)"),
  H2("7.4 Goals, Reminders & Reports"),
  bullet("Create savings goals and add deposits toward them; track progress visually."),
  bullet("Set bill reminders with due dates and overdue alerts."),
  bullet("Generate a financial report — emailed or downloaded as a PDF."),
  figure("Goals page and a generated report"),
  H2("7.5 AI Financial Assistant"),
  bullet("A floating chat bubble available on every page."),
  bullet("Answers natural-language questions (“Where am I overspending?”) from the user’s own data."),
  bullet("Runs privately on the app’s own server — no data is sent to an external AI provider."),
  figure("Floating AI assistant, opened, answering a question"),
  H2("7.6 Onboarding"),
  bullet("One-click “Try sample data” so new users see a full dashboard instantly."),
  bullet("A 6-step guided tour that spotlights real features."),
  bullet("Sample data clears automatically once the user adds anything real."),
  figure("Guided tour spotlight + the new-user empty state"),

  H1("8. The Intelligence Layer"),
  P("These features make SpendSmart feel “smart.” Importantly, they are transparent, rule-based algorithms that run on the user’s own data — not a black-box external AI."),
  H3("Financial Health Score (0–100)"),
  P("Everyone starts at a neutral 50. Good habits add points (a healthy savings rate, balanced categories, active investing); risky patterns subtract them (overspending in one category, many unusual transactions, heavy subscriptions). It turns a complex financial picture into one number people can act on."),
  H3("Anomaly (unusual-spend) detection"),
  P("Each transaction is checked against the user’s own patterns using several signals (how it compares to typical spend, the category, recurrence). Outliers are flagged for review, and the user can confirm one as ‘expected’ so it stops being flagged."),
  H3("Categorisation, subscriptions & forecasting"),
  bullet("Merchant names are matched to categories automatically on import."),
  bullet("Repeating charges are detected and grouped as subscriptions, with a monthly/yearly cost."),
  bullet("Next month’s spend is forecast using a recency-weighted average of recent months."),
  H3("The assistant"),
  P("The assistant interprets the question, picks the relevant numbers from the user’s analytics, and replies in a sentence with supporting facts — e.g. “Your largest category is Food at ₹12,400 (28% of spend).”"),

  H1("9. Unique Features & Comparison"),
  P("How SpendSmart differs from typical expense trackers:"),
  table(["Aspect", "Typical apps", "SpendSmart"], [
    ["Data access", "Link bank / read SMS (intrusive)", "Import statements — no special permissions"],
    ["AI insight", "Often send data to a cloud AI", "Private, on-server, from your own data"],
    ["Health score", "Rare", "Built-in 0–100 score with breakdown"],
    ["Anomaly alerts", "Rare", "Multi-signal unusual-spend detection"],
    ["Budgeting", "Resets monthly", "Unspent money carries forward"],
    ["Install", "Force app-store download", "Installable PWA on any device; instant updates"],
    ["What-if planning", "Rare", "Interactive savings simulator"],
  ], [2100, 3430, 3830]),

  H1("10. Security & Privacy"),
  bullet("Passwords are hashed with bcrypt — they cannot be read or recovered, even by the developer."),
  bullet("Authentication uses signed JWT access + refresh tokens; email verification confirms ownership."),
  bullet("A CAPTCHA and rate-limiting protect the sign-in routes from bots and abuse."),
  bullet("All traffic is over HTTPS; secrets live in server environment variables, not in the code."),
  bullet("Analytics load only after the user accepts the cookie banner; data is never sold."),
  bullet("A clear ‘not financial advice’ disclaimer is shown, and a Privacy Policy and Terms are published."),

  H1("11. Deployment, PWA & Mobile"),
  bullet("Front end on Vercel, API on Render, database on MongoDB Atlas — all continuously deployed from GitHub."),
  bullet("Installable PWA: users ‘Add to Home Screen’ on Android/iPhone or install on desktop; it runs full-screen and updates automatically with each deploy."),
  bullet("Capacitor wraps the same web app for the Google Play Store and Apple App Store, with no code rewrite."),
  bullet("SEO basics (sitemap, robots, meta tags) plus Google Search Console and Bing registration."),
  figure("The app installed on a phone home screen (PWA)"),

  H1("12. Limitations & Future Scope"),
  bullet("Free-tier hosting ‘sleeps’ when idle, so the first request after a pause is slow; a paid tier or keep-alive ping removes this."),
  bullet("Direct UPI / bank auto-linking requires India’s regulated Account Aggregator framework — a future, business-level step."),
  bullet("Analytics are single-currency today; multi-currency support is planned."),
  bullet("Planned: account-deletion (data-protection compliance), error monitoring, push notifications, and a larger AI model for the assistant."),

  H1("13. Conclusion"),
  lead("SpendSmart demonstrates that a genuinely useful personal-finance tool can be built without compromising user privacy. By combining effortless statement import, clear visual analytics, transparent ‘smart’ features, and a private assistant — delivered as an installable app on every platform — it turns scattered financial data into understanding and action. The architecture is modern and standard, the security is sound, and the design is intentionally honest about what it does with user data."),

  pb(),
  H1("Appendix A — Screenshot Checklist"),
  P("Capture these from the live app (use ‘Continue as Guest’ + ‘Try sample data’ for a full dashboard), then paste each into the matching placeholder above:"),
  numbered("Login / Sign-up screen (showing CAPTCHA + Guest button)."),
  numbered("New-user empty state and the 6-step guided tour."),
  numbered("Dashboard with sample data — KPI cards, charts, market ticker."),
  numbered("Statement import preview (detected rows, duplicates)."),
  numbered("Transactions page (filters + a transaction)."),
  numbered("Goals page and a generated PDF/email report."),
  numbered("Floating AI assistant, opened, with an answer."),
  numbered("Settings page; and the app installed on a phone home screen."),

  H1("Appendix B — Glossary"),
  table(["Term", "Plain meaning"], [
    ["PWA", "A website that can be installed and used like an app."],
    ["JWT", "A signed token that proves a user is logged in."],
    ["bcrypt hash", "A one-way scramble of a password that can’t be reversed."],
    ["REST API", "The set of web addresses the app calls to read/save data."],
    ["MongoDB", "A database that stores records as flexible documents."],
    ["CAPTCHA", "A check that the visitor is a human, not a bot."],
    ["Capacitor", "A tool that wraps a web app into a phone app for the stores."],
  ], [2200, 7160]),
];

/* ============================================================ */
/* REPORT 2 — UNDERSTANDING / STUDY GUIDE                       */
/* ============================================================ */
const r2 = [
  ...titlePage("Know Your Project", "A plain-English guide to understanding, explaining & defending SpendSmart", "Study & Presentation Companion — read this before any demo or viva"),
  ...toc(),

  H1("1. How to use this guide"),
  lead("This is the report I’d hand you the night before a presentation. The other report is the formal write-up; this one exists so that you genuinely understand your own project and can explain or defend any part of it confidently. Read it top to bottom once, then keep the cheat sheet (last page) handy."),

  H1("2. The 30-second pitch"),
  P([{ t: "Memorise this. ", b: true }, "“SpendSmart is an AI-powered personal-finance app. You upload your bank or UPI statement — or add transactions yourself — and it instantly shows where your money goes: spending by category, trends over time, a budget that carries forward, a 0–100 financial health score, alerts for unusual spending, and an assistant you can ask questions in plain English. It’s privacy-first — it never links your bank or sends your data to an outside AI — and it installs on any phone or desktop like a normal app.”"]),

  H1("3. The big picture, in plain English"),
  P([{ t: "An analogy: ", b: true }, "Think of SpendSmart as a smart accountant who only ever sees the paperwork you hand them. You give them your statement; they sort every expense into buckets, draw you charts, point out anything odd, give your finances a ‘fitness score’, and answer your questions — but they never get the keys to your bank. That ‘only sees what you hand over’ part is the whole privacy idea."]),
  P("Under the hood there are three pieces that work together:"),
  bullet([{ t: "The front end (what you see): ", b: true }, "the screens, buttons, and charts — built with React, running in your browser."]),
  bullet([{ t: "The back end (the brain): ", b: true }, "a server that checks your login, stores your data, and does the calculations — built with Node.js/Express."]),
  bullet([{ t: "The database (the memory): ", b: true }, "where your account and transactions are saved — MongoDB."]),

  H1("4. How one action actually flows"),
  P("If someone asks “what happens when a user adds a transaction?”, walk them through this:"),
  numbered("You fill the form and tap Save in the browser (the React front end)."),
  numbered("The front end sends the data to the back-end API, attaching your login token."),
  numbered("The server checks the token (are you really logged in?), validates the data, and saves it to MongoDB."),
  numbered("The server recalculates your analytics (totals, health score) and sends them back."),
  numbered("The front end updates the dashboard — all without reloading the page."),
  P([{ t: "One nice detail to mention: ", b: true }, "the front end and back end live on two different hosts, but the site is set up so the browser only ever talks to one address — requests to ‘/api’ are quietly forwarded to the back end. That avoids a whole class of cross-site errors."]),

  H1("5. Jargon decoder"),
  P("If any of these come up, here’s the one-line answer:"),
  table(["If they say…", "You say…"], [
    ["“Why MongoDB?”", "It stores flexible records (documents); transactions vary, so it fits well and is easy to query."],
    ["“How is login secure?”", "Passwords are bcrypt-hashed (irreversible), and login uses signed JWT tokens that expire."],
    ["“What’s a JWT?”", "A tamper-proof token the server gives you at login and checks on every request."],
    ["“What’s a PWA?”", "A website that installs and behaves like a real app, and updates itself."],
    ["“Is the AI a real LLM?”", "No — it’s a transparent rule-based engine on our own server, which keeps data private."],
    ["“How does it get bank data?”", "Users import statements (CSV/Excel/PDF). We never link banks or read SMS."],
    ["“Where is it hosted?”", "Front end on Vercel, API on Render, database on MongoDB Atlas."],
  ], [2700, 6660]),

  H1("6. What to say about each feature"),
  bullet([{ t: "Dashboard — ", b: true }, "“One glance shows spending, income, savings, and a health score; I can filter by any time range.”"]),
  bullet([{ t: "Import — ", b: true }, "“It reads CSV, Excel, and PDF statements, previews them, and skips duplicates automatically.”"]),
  bullet([{ t: "Health score — ", b: true }, "“It grades financial habits out of 100 — savings rate, category balance, anomalies — so it’s actionable.”"]),
  bullet([{ t: "Anomaly detection — ", b: true }, "“It flags transactions that are unusual for that user, and they can mark one as expected.”"]),
  bullet([{ t: "Assistant — ", b: true }, "“Ask a question in plain English; it answers from your own numbers, privately.”"]),
  bullet([{ t: "Budget carry-forward — ", b: true }, "“Unspent money rolls into next month, which matches how people actually budget.”"]),
  bullet([{ t: "Onboarding — ", b: true }, "“One tap loads sample data and a guided tour, so a new user isn’t staring at an empty screen.”"]),

  H1("7. The clever bits — so you can defend them"),
  H3("“How does the health score work?”"),
  P("Everyone starts at 50. The system adds points for good habits (saving a healthy share of income, keeping any one category under about a third of spend, investing) and subtracts for risky ones (overspending a category, lots of unusual transactions, heavy subscriptions). It’s deliberately simple and explainable — the app even shows the breakdown."),
  H3("“How does anomaly detection work without machine learning?”"),
  P("It compares each transaction to the user’s own typical behaviour using several signals at once — size relative to normal, category, and whether it recurs. Anything that stands out is flagged. This is transparent and fast, and it never needs to send data anywhere."),
  H3("“Why not a real AI/LLM for the assistant?”"),
  P("Two reasons, and both are good answers: privacy (financial data never leaves our server) and reliability/cost (no external dependency or per-question cost). The rule-based engine maps a question to the right numbers and answers in a sentence. A larger model is listed as future scope."),

  H1("8. Likely questions & strong answers"),
  H3("“What makes it different from existing apps?”"),
  P("“Most trackers link your bank or read your SMS — intrusive and increasingly blocked by app stores. SpendSmart uses statement import, keeps the AI private, and adds a health score, anomaly alerts, and a what-if simulator. And it installs on any device as a PWA, updating instantly.”"),
  H3("“Is user data safe?”"),
  P("“Passwords are hashed and unrecoverable, sessions use expiring tokens, sign-in is bot-protected and rate-limited, everything is over HTTPS, secrets are in environment variables, and analytics only load with consent. We don’t sell data.”"),
  H3("“How does it scale / what are the limits?”"),
  P("“It runs on free tiers today, which is why the first request after idle can be slow — a paid tier removes that. Market data is cached to respect API limits. The architecture is standard three-tier, so scaling is a hosting upgrade, not a rewrite.”"),
  H3("“Can it connect to UPI / my bank directly?”"),
  P("“Not directly — India only allows that through the regulated Account Aggregator framework, which is a business-level step. For now, statement import gives the same insight without the regulatory and privacy burden.”"),
  H3("“What was the hardest part?”"),
  P("Pick a real one and be honest, e.g.: “Getting email to send reliably from the cloud — the host blocks SMTP ports, so I switched to sending through an email provider’s HTTPS API.” (Shows real problem-solving.)"),

  H1("9. Honest weaknesses (and how to answer them)"),
  bullet([{ t: "Cold starts: ", b: true }, "“Free hosting sleeps; first load can be slow. Fixed by a paid tier or a keep-alive ping.”"]),
  bullet([{ t: "Rule-based AI: ", b: true }, "“It only answers recognised questions — a deliberate privacy/cost trade-off, with a bigger model as future work.”"]),
  bullet([{ t: "Single currency: ", b: true }, "“Analytics assume one currency today; multi-currency is planned.”"]),
  bullet([{ t: "Manual import: ", b: true }, "“No auto bank sync — by design, for privacy; the compliant path is Account Aggregator later.”"]),

  pb(),
  H1("10. One-page cheat sheet"),
  P([{ t: "What it is: ", b: true }, "a privacy-first, AI-assisted personal-finance web app (installable as a PWA)."]),
  P([{ t: "Stack: ", b: true }, "React + Vite (front end) · Node.js + Express (API) · MongoDB Atlas (database). Hosted on Vercel + Render."]),
  P([{ t: "Data: ", b: true }, "four collections — Users, Transactions, Goals, Notes. Insights are computed live, not stored."]),
  P([{ t: "Auth: ", b: true }, "email + OTP verification · bcrypt-hashed passwords · JWT access + refresh tokens · CAPTCHA + rate-limiting."]),
  P([{ t: "Headline features: ", b: true }, "statement import · dashboard + charts · carry-forward budget · health score · anomaly detection · subscriptions · forecasting · goals · reminders · reports · private AI assistant."]),
  P([{ t: "Unique angle: ", b: true }, "no bank-linking or SMS reading; private on-server AI; installable everywhere with instant updates."]),
  P([{ t: "Limits: ", b: true }, "free-tier cold starts · single currency · rule-based assistant · no direct bank sync (needs Account Aggregator)."]),
  P([{ t: "One-line pitch: ", b: true }, "“It turns the statements you already have into a clear, private picture of your money — with a health score and an assistant — on any device.”"]),
];

/* ---------- write both ---------- */
Promise.all([
  Packer.toBuffer(buildDoc("SpendSmart — Project Report", r1)).then(b => fs.writeFileSync("SpendSmart_Project_Report.docx", b)),
  Packer.toBuffer(buildDoc("SpendSmart — Know Your Project", r2)).then(b => fs.writeFileSync("SpendSmart_Understanding_Guide.docx", b)),
]).then(() => console.log("Both reports written.")).catch(e => { console.error(e); process.exit(1); });
