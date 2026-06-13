const Papa   = require("papaparse");
const XLSX   = require("xlsx");
const fs     = require("fs");
const path   = require("path");
const _      = require("lodash");

const MERCHANT_MAP = {
  zomato:"Food", swiggy:"Food", mcdonalds:"Food", kfc:"Food", starbucks:"Food",
  "burger king":"Food", dominos:"Food", "pizza hut":"Food", dunkin:"Food", subway:"Food",
  "cafe coffee day":"Food", barbeque:"Food", haldiram:"Food",
  uber:"Travel", ola:"Travel", metro:"Travel", rapido:"Travel", irctc:"Travel",
  "make my trip":"Travel", redbus:"Travel", "go ibibo":"Travel", indigo:"Travel",
  vistara:"Travel", spicejet:"Travel", "air india":"Travel", oyo:"Travel", airbnb:"Travel",
  netflix:"Subscriptions", spotify:"Subscriptions", "amazon prime":"Subscriptions",
  hotstar:"Subscriptions", zee5:"Subscriptions", "youtube premium":"Subscriptions",
  "apple music":"Subscriptions", "disney+":"Subscriptions", "sony liv":"Subscriptions",
  audible:"Subscriptions", "google one":"Subscriptions", icloud:"Subscriptions",
  amazon:"Shopping", myntra:"Shopping", flipkart:"Shopping", nykaa:"Shopping",
  decathlon:"Shopping", ajio:"Shopping", meesho:"Shopping", "tata cliq":"Shopping",
  ikea:"Shopping", croma:"Shopping", "vijay sales":"Shopping",
  "big bazaar":"Groceries", dmart:"Groceries", reliance:"Groceries",
  jiomart:"Groceries", spencer:"Groceries", "more supermarket":"Groceries",
  blinkit:"Groceries", zepto:"Groceries", "instamart":"Groceries", bigbasket:"Groceries",
  airtel:"Utilities", jio:"Utilities", bsnl:"Utilities", "vi ":"Utilities",
  electricity:"Utilities", "water bill":"Utilities", "gas bill":"Utilities",
  broadband:"Utilities", wifi:"Utilities", "mseb":"Utilities", "bescom":"Utilities",
  "credit card bill":"Bills", "bill payment":"Bills", "bbps":"Bills",
  pvr:"Entertainment", inox:"Entertainment", bookmyshow:"Entertainment",
  "game":"Entertainment", steam:"Entertainment", playstation:"Entertainment",
  gym:"Healthcare", "apollo pharmacy":"Healthcare", medplus:"Healthcare",
  pharmeasy:"Healthcare", "1mg":"Healthcare", practo:"Healthcare", hospital:"Healthcare",
  clinic:"Healthcare", diagnostic:"Healthcare",
  coursera:"Education", udemy:"Education", byju:"Education", unacademy:"Education",
  "school fee":"Education", "college fee":"Education", tuition:"Education",
  lic:"Insurance", "policy bazaar":"Insurance", "hdfc ergo":"Insurance",
  "star health":"Insurance", "insurance premium":"Insurance", "term plan":"Insurance",
  salary:"Salary", payroll:"Salary",
  freelance:"Freelance Income", upwork:"Freelance Income", fiverr:"Freelance Income",
  rent:"Rent", "house rent":"Rent",
  emi:"EMI", "loan repayment":"EMI", "home loan":"EMI", "car loan":"EMI",
  fuel:"Fuel", petrol:"Fuel", diesel:"Fuel", "indian oil":"Fuel", hpcl:"Fuel", bpcl:"Fuel",
  "mutual fund":"Investments", zerodha:"Investments", groww:"Investments",
  upstox:"Investments", "sip ":"Investments", etf:"Investments", "fixed deposit":"Investments",
  "neft":"Transfers", "imps":"Transfers", "rtgs":"Transfers", "upi transfer":"Transfers",
  "rd deposit":"Savings", "ppf":"Savings", "sukanya":"Savings",
  // Common Indian UPI merchant keywords (GPay statements)
  "sweets":"Food", "caterers":"Food", "restaurant":"Food", "hotel":"Food",
  "bakery":"Food", "dhaba":"Food", "juice":"Food", "tea ":"Food", "chai":"Food",
  "service station":"Fuel", "petroleum":"Fuel", "filling station":"Fuel",
  "kirana":"Groceries", "general store":"Groceries", "supermarket":"Groceries",
  "mart":"Groceries", "provision":"Groceries",
  "medical":"Healthcare", "chemist":"Healthcare", "dental":"Healthcare",
  "recharge":"Utilities", "stationery":"Education", "xerox":"Education",
  "salon":"Others", "parlour":"Others", "tailor":"Others",
};

function normalizeMerchant(name) {
  return _.startCase(_.toLower((name || "").trim().replace(/\s+/g, " ")));
}

function detectCategory(merchant) {
  const m = merchant.toLowerCase();
  for (const [key, cat] of Object.entries(MERCHANT_MAP)) {
    if (m.includes(key)) return cat;
  }
  return "Others";
}

function parseDate(raw) {
  if (!raw) return null;
  // Handle DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
  let d;
  if (typeof raw === "number") {
    // Excel serial date
    d = new Date((raw - 25569) * 86400 * 1000);
  } else {
    const s = String(raw).trim();
    // Try DD/MM/YYYY
    const ddmm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmm) {
      d = new Date(`${ddmm[3]}-${ddmm[2].padStart(2,"0")}-${ddmm[1].padStart(2,"0")}`);
    } else {
      d = new Date(s);
    }
  }
  if (isNaN(d?.getTime())) return null;
  return d;
}

function calcZScores(values) {
  const mean = _.mean(values);
  const std  = Math.sqrt(_.mean(values.map(v => Math.pow(v - mean, 2))));
  return values.map(v => std === 0 ? 0 : (v - mean) / std);
}

function validateAndClean(rows) {
  const issues = { missing: 0, negative: 0, duplicate: 0, invalidDate: 0, futureDate: 0, autoCategory: 0, zeroAmount: 0 };
  const seen   = new Set();
  const cleaned = [];

  for (const row of rows) {
    const rawDate  = row.Date   || row.date   || row.DATE   || row.Transaction_Date || row["Transaction Date"];
    const rawMerch = row.Merchant || row.merchant || row.MERCHANT || row.Description || row.Narration || row.Particulars || "";
    const rawAmt   = row.Amount || row.amount || row.AMOUNT || row.Debit || row.debit || row.Credit || row.credit;
    let   rawCat   = row.Category || row.category || row.CATEGORY || "";
    const payMethod= row.Payment_Method || row.payment_method || row.Mode || "";
    const city     = row.City || row.city || "";
    const rawType  = (row.Type || row.type || "expense").toLowerCase();
    const isCredit = row.Credit || row.credit;

    if (!rawDate || !rawMerch || rawAmt === undefined || rawAmt === null || String(rawAmt).trim() === "") {
      issues.missing++; continue;
    }
    const parsedDate = parseDate(rawDate);
    if (!parsedDate) { issues.invalidDate++; continue; }
    if (parsedDate > new Date()) { issues.futureDate++; continue; }

    const amount = parseFloat(String(rawAmt).replace(/[₹,\s]/g, ""));
    if (isNaN(amount)) { issues.missing++; continue; }
    if (amount === 0) { issues.zeroAmount++; continue; }
    if (amount < 0)  { issues.negative++; continue; }

    const merchant = normalizeMerchant(rawMerch);
    let autoDetected = false;
    if (!rawCat || rawCat.trim() === "") {
      rawCat = detectCategory(merchant);
      autoDetected = true;
      issues.autoCategory++;
    } else {
      rawCat = _.startCase(_.toLower(rawCat.trim()));
    }

    // Determine type from context
    let type = "expense";
    if (isCredit && !row.Debit) type = "income";
    else if (["income","salary","freelance"].some(k => rawType.includes(k))) type = "income";
    else if (["saving","transfer"].some(k => rawType.includes(k))) type = rawType.includes("saving") ? "saving" : "transfer";

    const isoDate = parsedDate.toISOString().slice(0, 10);
    // Include time when the source provides it (GPay) so genuine same-day
    // repeat payments to the same merchant are not dropped as duplicates
    const key = `${isoDate}-${merchant.toLowerCase()}-${amount}-${row.Time || ""}`;
    if (seen.has(key)) { issues.duplicate++; continue; }
    seen.add(key);

    cleaned.push({ date: isoDate, merchant, amount, category: rawCat, type, paymentMethod: payMethod, city, dayOfWeek: parsedDate.getDay(), source: "upload", isOutlier: false });
  }

  // Z-score outlier detection
  const expenseAmounts = cleaned.filter(r => r.type === "expense").map(r => r.amount);
  const zScores = calcZScores(expenseAmounts);
  let zi = 0;
  const valid = cleaned.map(r => {
    if (r.type === "expense") {
      const isOutlier = Math.abs(zScores[zi]) > 2.5;
      zi++;
      return { ...r, isOutlier };
    }
    return r;
  });

  return { valid, issues };
}

// ── GPay statement parser ─────────────────────────────────────
// Google Pay PDF text extracts with all spaces stripped:
//   01Mar,2026 / 11:35AM / PaidtoSanjayServiceStation /
//   UPITransactionID:... / PaidbyKotakMahindraBank9390 / ₹150
const GPAY_MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

// Re-insert spaces lost in extraction: "NirmalaGaikwad" → "Nirmala Gaikwad"
function splitConcatenated(name) {
  return (name || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGPayText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const rows = [];
  let current = null;

  for (const line of lines) {
    const dateMatch = line.match(/^(\d{1,2})([A-Za-z]{3}),(\d{4})$/);
    if (dateMatch) {
      const month = GPAY_MONTHS[dateMatch[2].toLowerCase()];
      if (month) current = { date: `${dateMatch[3]}-${month}-${dateMatch[1].padStart(2, "0")}`, merchant: null, type: null, time: "" };
      continue;
    }
    if (!current) continue;

    const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    if (timeMatch) { current.time = timeMatch[1]; continue; }

    const paid = line.match(/^Paidto(.+)$/i);
    const received = line.match(/^Receivedfrom(.+)$/i);
    const sent = line.match(/^(?:Moneysentto|Sentto)(.+)$/i);
    if (paid || received || sent) {
      // Only the first detail line per block is the merchant. Received blocks
      // carry a second routing line ("Paidto<Bank>NNNN" — the credited account)
      // which must not overwrite it.
      if (!current.merchant) {
        const raw = (paid || received || sent)[1];
        current.merchant = splitConcatenated(raw).slice(0, 60);
        current.type = paid ? "expense" : received ? "income" : "transfer";
      }
      continue;
    }

    const amt = line.match(/^₹\s*([\d,]+(?:\.\d{1,2})?)$/);
    if (amt && current.merchant) {
      const amount = parseFloat(amt[1].replace(/,/g, ""));
      if (amount > 0) {
        rows.push({
          Date: current.date, Merchant: current.merchant, Amount: amount,
          Type: current.type, Payment_Method: "UPI", Time: current.time,
        });
      }
      current = null; // block complete
    }
  }
  return rows;
}

// ── PDF Parser ────────────────────────────────────────────────
async function parsePDF(filePath) {
  const pdfParse = require("pdf-parse");
  const buffer   = fs.readFileSync(filePath);
  const data     = await pdfParse(buffer);
  const text     = data.text;

  // GPay statements have a distinctive shape — try the dedicated parser first
  if (/UPITransactionID|Paidto[A-Z]/.test(text.replace(/\s/g, ""))) {
    const gpayRows = parseGPayText(text);
    if (gpayRows.length > 0) return validateAndClean(gpayRows);
  }

  const rows = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Try to detect date + amount patterns in PDF text
  // Pattern: any line with a date and a number
  const dateAmtPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
  const amtPattern     = /₹?\s*([\d,]+\.?\d{0,2})/;

  for (const line of lines) {
    const dateMatch = line.match(dateAmtPattern);
    const amtMatch  = line.match(amtPattern);
    if (dateMatch && amtMatch) {
      const amount = parseFloat(amtMatch[1].replace(/,/g, ""));
      if (amount > 0 && amount < 500000) {
        // Extract merchant — text between date and amount
        const merchant = line
          .replace(dateMatch[0], "")
          .replace(amtMatch[0], "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60) || "Unknown";
        rows.push({ Date: dateMatch[0], Merchant: merchant, Amount: amount });
      }
    }
  }

  if (rows.length === 0) {
    throw new Error("Could not extract transactions from this PDF. Try CSV or XLSX format for best results.");
  }
  return validateAndClean(rows);
}

function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return parsePDF(filePath);  // returns Promise
  if (ext === ".csv") {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content.trim()) throw new Error("File is empty.");
    const result = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: false });
    if (!result.data.length) throw new Error("No data rows found in CSV.");
    return Promise.resolve(validateAndClean(result.data));
  }
  if ([".xlsx", ".xls"].includes(ext)) {
    const workbook = XLSX.readFile(filePath);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { raw: false });
    if (!rows.length) throw new Error("No data rows found in Excel file.");
    return Promise.resolve(validateAndClean(rows));
  }
  throw new Error("Unsupported format. Please upload .csv, .xlsx, or .pdf");
}

module.exports = { parseFile };
