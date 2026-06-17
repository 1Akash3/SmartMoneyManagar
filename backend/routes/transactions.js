const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const auth     = require("../middleware/auth");
const dal      = require("../utils/dal");
const { parseFile }                                 = require("../utils/parser");
const { computeAnalytics, generateRecommendations } = require("../utils/analytics");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage    = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  [".csv", ".xlsx", ".xls", ".pdf"].includes(ext)
    ? cb(null, true)
    : cb(new Error("Only .csv, .xlsx, or .pdf files are allowed"), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

// Compute analytics with the user's budget applied
async function analyticsFor(userId, filters = {}) {
  const [txns, user] = await Promise.all([
    dal.getTransactions(userId, filters),
    dal.findUserById(userId),
  ]);
  if (!txns.length) return null;
  return computeAnalytics(txns, { monthlyBudget: parseFloat(user?.monthlyBudget) || 0 });
}

const txnKey = t => `${t.date}|${(t.merchant || "").toLowerCase()}|${t.amount}`;

// Drop rows that already exist in the user's data (re-uploaded statement).
// Counts per key so a file with N legitimate same-day duplicates only skips
// as many copies as are already stored.
async function dedupeAgainstDb(userId, rows) {
  const existing = await dal.getTransactions(userId);
  const stored = new Map();
  existing.forEach(t => { const k = txnKey(t); stored.set(k, (stored.get(k) || 0) + 1); });
  const fresh = rows.filter(r => {
    const k = txnKey(r);
    const left = stored.get(k) || 0;
    if (left > 0) { stored.set(k, left - 1); return false; }
    return true;
  });
  return { fresh, alreadyInSystem: rows.length - fresh.length };
}

function newImportId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function cleanFileName(filePath) {
  // Stored as "<timestamp>-<original name>"
  return path.basename(filePath).replace(/^\d{13}-/, "");
}

router.get("/", auth, async (req, res) => {
  try {
    const { startDate, endDate, category, type, search } = req.query;
    let txns = await dal.getTransactions(req.user.id, { startDate, endDate, category, type });
    if (search) {
      const q = search.toLowerCase();
      txns = txns.filter(t => t.merchant.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q));
    }
    res.json(txns);
  } catch (err) { res.status(500).json({ error: "Failed to fetch transactions." }); }
});

router.get("/analytics", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    res.json(await analyticsFor(req.user.id, { startDate, endDate }));
  } catch (err) { res.status(500).json({ error: "Failed to compute analytics." }); }
});

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const { valid, issues } = await parseFile(req.file.path);
    if (!valid.length) return res.status(400).json({ error: "No valid transactions found in file.", issues });
    await dal.deleteTransactionsByImport(req.user.id, "sample"); // a real import replaces demo sample data
    const { fresh, alreadyInSystem } = await dedupeAgainstDb(req.user.id, valid);
    if (!fresh.length) return res.status(400).json({ error: "This statement appears to have been imported already — all rows exist in your data.", issues: { ...issues, alreadyInSystem } });
    const importId = newImportId();
    const importFile = req.file.originalname;
    await dal.createManyTransactions(fresh.map(t => ({ ...t, userId: req.user.id, importId, importFile })));
    res.json({ success: true, imported: fresh.length, issues: { ...issues, alreadyInSystem }, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload preview — parse but do NOT save
router.post("/preview", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const { valid, issues } = await parseFile(req.file.path);
    res.json({ preview: valid.slice(0, 10), total: valid.length, issues, filePath: req.file.path });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Confirm import after preview
router.post("/confirm-import", auth, async (req, res) => {
  try {
    const { filePath } = req.body;
    // Only allow files inside our uploads directory (no path traversal)
    if (!filePath || !path.resolve(filePath).startsWith(path.resolve(uploadsDir))) {
      return res.status(400).json({ error: "Invalid file reference." });
    }
    if (!fs.existsSync(filePath)) return res.status(400).json({ error: "Upload session expired. Please upload the file again." });
    const { valid, issues } = await parseFile(filePath);
    if (!valid.length) return res.status(400).json({ error: "No valid transactions found.", issues });
    await dal.deleteTransactionsByImport(req.user.id, "sample"); // a real import replaces demo sample data
    const { fresh, alreadyInSystem } = await dedupeAgainstDb(req.user.id, valid);
    if (!fresh.length) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ error: "This statement appears to have been imported already — all rows exist in your data.", issues: { ...issues, alreadyInSystem } });
    }
    const importId = newImportId();
    const importFile = cleanFileName(filePath);
    await dal.createManyTransactions(fresh.map(t => ({ ...t, userId: req.user.id, importId, importFile })));
    fs.unlink(filePath, () => {});
    res.json({ success: true, imported: fresh.length, issues: { ...issues, alreadyInSystem }, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Import batches: list and delete a whole dataset ───────────
router.get("/imports", auth, async (req, res) => {
  try {
    const txns = await dal.getTransactions(req.user.id);
    const batches = {};
    txns.forEach(t => {
      // Anything not manually entered is an import. Older app versions stored
      // the file extension in `source` ("csv"/"xlsx") — group those as legacy too.
      if (t.source === "manual") return;
      const key = t.importId || "legacy";
      const b = batches[key] || (batches[key] = {
        importId: key,
        file: t.importId ? (t.importFile || "Statement") : "Earlier imports (before dataset tracking)",
        legacy: !t.importId, count: 0,
        totalExpense: 0, totalIncome: 0, firstDate: t.date, lastDate: t.date,
        importedAt: t.createdAt,
      });
      b.count++;
      if (t.type === "income") b.totalIncome += t.amount; else if (t.type === "expense" || !t.type) b.totalExpense += t.amount;
      if (t.date < b.firstDate) b.firstDate = t.date;
      if (t.date > b.lastDate) b.lastDate = t.date;
      if (t.createdAt && (!b.importedAt || t.createdAt < b.importedAt)) b.importedAt = t.createdAt;
    });
    const manualCount = txns.filter(t => t.source === "manual").length;
    res.json({
      imports: Object.values(batches).sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt))),
      manualCount,
    });
  } catch (err) { res.status(500).json({ error: "Failed to fetch imports." }); }
});

router.delete("/imports/:importId", auth, async (req, res) => {
  try {
    const deleted = req.params.importId === "legacy"
      ? await dal.deleteLegacyUploads(req.user.id)
      : await dal.deleteTransactionsByImport(req.user.id, req.params.importId);
    if (!deleted) return res.status(404).json({ error: "Import not found." });
    res.json({ success: true, deleted, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: "Failed to delete import." }); }
});

router.post("/", auth, async (req, res) => {
  try {
    const { date, merchant, amount, category, type, paymentMethod, city, notes, isRecurring } = req.body;
    if (!date || !merchant || !amount || !category) return res.status(400).json({ error: "Date, merchant, amount and category are required." });
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: "Amount must be a positive number." });
    if (new Date(date) > new Date()) return res.status(400).json({ error: "Date cannot be in the future." });
    await dal.deleteTransactionsByImport(req.user.id, "sample"); // real data replaces demo sample data
    const txn = await dal.createTransaction({
      userId: req.user.id, date, merchant: merchant.trim(), amount: parseFloat(amount),
      category, type: type || "expense", paymentMethod: paymentMethod || "",
      city: city || "", notes: notes || "", isRecurring: isRecurring || false,
      dayOfWeek: new Date(date).getDay(), source: "manual", isOutlier: false,
    });
    res.status(201).json({ success: true, transaction: txn, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: "Failed to add transaction." }); }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.amount !== undefined) {
      data.amount = parseFloat(data.amount);
      if (isNaN(data.amount) || data.amount <= 0) return res.status(400).json({ error: "Amount must be a positive number." });
    }
    if (data.date) data.dayOfWeek = new Date(data.date).getDay();
    const updated = await dal.updateTransaction(req.params.id, req.user.id, data);
    if (!updated) return res.status(404).json({ error: "Transaction not found." });
    res.json({ success: true, transaction: updated, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: "Failed to update transaction." }); }
});

// Confirm an anomaly as expected — removes it from future outlier reports
router.post("/:id/confirm-expected", auth, async (req, res) => {
  try {
    const updated = await dal.updateTransaction(req.params.id, req.user.id, { expectedConfirmed: true, isOutlier: false });
    if (!updated) return res.status(404).json({ error: "Transaction not found." });
    res.json({ success: true, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: "Failed to confirm transaction." }); }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const removed = await dal.deleteTransaction(req.params.id, req.user.id);
    if (!removed) return res.status(404).json({ error: "Transaction not found." });
    res.json({ success: true, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: "Failed to delete transaction." }); }
});

router.post("/recommendations", auth, async (req, res) => {
  try {
    const analytics = await analyticsFor(req.user.id);
    if (!analytics) return res.status(400).json({ error: "No transactions found." });
    const { priority = "Savings", customGoal = "" } = req.body;
    res.json(generateRecommendations(analytics, priority, customGoal));
  } catch (err) { res.status(500).json({ error: "Failed to generate recommendations." }); }
});

// ── Sample/demo data — lets new users explore instantly ───────
function buildSampleTransactions(userId) {
  const today = new Date();
  const dateOf = n => { const x = new Date(today); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const rows = [];
  const add = (n, merchant, amount, category, type = "expense", paymentMethod = "UPI") =>
    rows.push({
      userId, date: dateOf(n), merchant, amount, category, type, paymentMethod,
      source: "upload", importId: "sample", importFile: "Sample data",
      dayOfWeek: new Date(dateOf(n)).getDay(), isOutlier: false,
    });

  // Income
  [82, 52, 22].forEach(n => add(n, "Acme Corp Payroll", 78000, "Salary", "income", "Bank Transfer"));
  add(40, "Freelance Project", 12000, "Freelance Income", "income", "Bank Transfer");
  // Recurring
  [80, 50, 20].forEach(n => add(n, "Sunrise Apartments", 15000, "Rent", "expense", "Bank Transfer"));
  [78, 48, 18].forEach(n => add(n, "Netflix", 199, "Subscriptions"));
  [77, 47, 17].forEach(n => add(n, "Spotify", 119, "Subscriptions"));
  [75, 45, 15].forEach(n => add(n, "Airtel", 799, "Utilities"));
  // Everyday spend
  [
    [3, "Zomato", 420, "Food"], [5, "Swiggy", 360, "Food"], [9, "Starbucks", 280, "Food"],
    [19, "Cafe Coffee Day", 220, "Food"], [2, "Amazon", 1899, "Shopping"], [12, "Flipkart", 2499, "Shopping"],
    [25, "Myntra", 1299, "Shopping"], [28, "Croma", 3499, "Shopping"], [4, "Uber", 240, "Travel"],
    [8, "Ola", 180, "Travel"], [30, "IRCTC", 1450, "Travel"], [31, "Rapido", 90, "Travel"],
    [6, "BigBasket", 2100, "Groceries"], [16, "DMart", 1750, "Groceries"], [27, "Blinkit", 540, "Groceries"],
    [7, "BookMyShow", 700, "Entertainment"], [21, "Hotstar", 299, "Entertainment"],
    [10, "Apollo Pharmacy", 640, "Healthcare"], [14, "Indian Oil", 1500, "Fuel"], [35, "HP Petrol", 1200, "Fuel"],
    [13, "Udemy", 499, "Education"], [23, "Decathlon", 1899, "Shopping"],
  ].forEach(([n, m, a, c]) => add(n, m, a, c));
  [11, 38].forEach((n, i) => add(n, i ? "Groww" : "Zerodha", i ? 3000 : 5000, "Investments", "investment", "Bank Transfer"));

  return rows;
}

router.post("/load-sample", auth, async (req, res) => {
  try {
    await dal.deleteTransactionsByImport(req.user.id, "sample"); // idempotent
    const rows = buildSampleTransactions(req.user.id);
    await dal.createManyTransactions(rows);
    res.json({ success: true, imported: rows.length, analytics: await analyticsFor(req.user.id) });
  } catch (err) { res.status(500).json({ error: "Failed to load sample data." }); }
});

module.exports = router;
