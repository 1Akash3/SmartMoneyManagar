const _ = require("lodash");

/**
 * Multi-signal anomaly detection (Isolation-Forest-inspired, pure JS).
 * Scores each expense on independent signals and isolates the ones that
 * are anomalous on several axes at once — far fewer false positives than
 * a single z-score cut:
 *   1. Amount deviation  — robust modified z-score using median + MAD
 *   2. Merchant rarity   — first-time / rarely-seen merchants
 *   3. Category deviation — amount vs that category's own median
 *   4. Timing            — spend on a day-of-week the user rarely spends on
 * A transaction the user confirmed as expected is never flagged again.
 */
function detectAnomalies(expenses) {
  if (expenses.length < 5) return [];

  const amounts = expenses.map(t => t.amount);
  const median  = sortedQuantile(amounts, 0.5);
  const mad     = sortedQuantile(amounts.map(a => Math.abs(a - median)), 0.5) || 1;

  const merchantCount = {};
  const categoryAmounts = {};
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  expenses.forEach(t => {
    merchantCount[t.merchant] = (merchantCount[t.merchant] || 0) + 1;
    (categoryAmounts[t.category] = categoryAmounts[t.category] || []).push(t.amount);
    if (t.dayOfWeek >= 0 && t.dayOfWeek <= 6) dowCount[t.dayOfWeek]++;
  });
  const avgDow = expenses.length / 7;

  return expenses
    .map(t => {
      if (t.expectedConfirmed) return null;

      // Signal 1: robust amount deviation
      const modZ = (0.6745 * (t.amount - median)) / mad;
      const amountSig = Math.min(Math.max(modZ / 3.5, 0), 2); // >3.5 modified z = strong

      // Signal 2: merchant rarity (only matters when amount is also elevated)
      const raritySig = merchantCount[t.merchant] === 1 && modZ > 1.5 ? 0.6 : 0;

      // Signal 3: deviation inside its own category
      const catAmts  = categoryAmounts[t.category];
      const catMed   = sortedQuantile(catAmts, 0.5);
      const catSig   = catAmts.length >= 3 && t.amount > catMed * 3 ? 0.6 : 0;

      // Signal 4: unusual day-of-week
      const timeSig = dowCount[t.dayOfWeek] < avgDow * 0.3 && modZ > 1 ? 0.3 : 0;

      const score = amountSig + raritySig + catSig + timeSig;
      return score >= 1.2
        ? { id: (t._id || t.id || "").toString(), date: t.date, merchant: t.merchant, amount: t.amount, category: t.category, score: Math.round(score * 100) / 100 }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function sortedQuantile(arr, q) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.ceil(pos)] - s[lo]) * (pos - lo);
}

const SUB_KEYWORDS = [
  "netflix", "spotify", "amazon prime", "prime video", "hotstar", "zee5",
  "youtube premium", "apple music", "apple tv", "disney", "sony liv",
  "gym", "cult fit", "audible", "linkedin premium", "google one", "icloud",
];

function computeAnalytics(transactions, options = {}) {
  if (!transactions || !transactions.length) return null;

  const expenses    = transactions.filter(t => t.type === "expense" || !t.type);
  const incomes     = transactions.filter(t => t.type === "income");
  const savingsTxns = transactions.filter(t => t.type === "saving");
  const investments = transactions.filter(t => t.type === "investment");

  const total       = Math.round(_.sumBy(expenses, "amount"));
  const totalIncome = Math.round(_.sumBy(incomes, "amount"));
  const totalSaved  = Math.round(_.sumBy(savingsTxns, "amount"));
  const totalInvested = Math.round(_.sumBy(investments, "amount"));
  const netSavings  = totalIncome - total;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const expenseRatio = totalIncome > 0 ? Math.round((total / totalIncome) * 100) : null;

  const amounts = expenses.map(t => t.amount);
  const mean    = amounts.length ? Math.round(_.mean(amounts)) : 0;
  const median  = Math.round(sortedQuantile(amounts, 0.5));
  const max     = amounts.length ? Math.round(_.max(amounts)) : 0;
  const min     = amounts.length ? Math.round(_.min(amounts)) : 0;

  // Category totals
  const catTotals = {};
  expenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  Object.keys(catTotals).forEach(k => { catTotals[k] = Math.round(catTotals[k]); });

  // Daily trend
  const dailyMap = {};
  expenses.forEach(t => { dailyMap[t.date] = (dailyMap[t.date] || 0) + t.amount; });
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount: Math.round(amount) }));

  // Weekly trend
  const weeklyMap = {};
  expenses.forEach(t => {
    const d = parseInt(t.date.slice(8, 10));
    const week = `Week ${Math.min(Math.floor((d - 1) / 7) + 1, 5)}`;
    weeklyMap[week] = (weeklyMap[week] || 0) + t.amount;
  });
  const weeklyTrend = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, amount]) => ({ week, amount: Math.round(amount) }));

  // Monthly trend + cash flow (income vs expense per month)
  const monthlyMap = {};
  expenses.forEach(t => {
    const month = t.date.slice(0, 7);
    monthlyMap[month] = (monthlyMap[month] || 0) + t.amount;
  });
  const incomeMonthly = {};
  incomes.forEach(t => {
    const month = t.date.slice(0, 7);
    incomeMonthly[month] = (incomeMonthly[month] || 0) + t.amount;
  });
  const allMonths = [...new Set([...Object.keys(monthlyMap), ...Object.keys(incomeMonthly)])].sort();
  const monthlyTrend = allMonths.map(month => ({
    month,
    amount: Math.round(monthlyMap[month] || 0),
    income: Math.round(incomeMonthly[month] || 0),
    net: Math.round((incomeMonthly[month] || 0) - (monthlyMap[month] || 0)),
  }));

  // Top merchants
  const merchantMap = {};
  expenses.forEach(t => { merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + t.amount; });
  const topMerchants = Object.entries(merchantMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([merchant, amount]) => ({ merchant, amount: Math.round(amount) }));

  // Weekend vs weekday
  const weekendTxns = expenses.filter(t => t.dayOfWeek === 0 || t.dayOfWeek === 6);
  const weekdayTxns = expenses.filter(t => t.dayOfWeek > 0 && t.dayOfWeek < 6);
  const weekendTotal = Math.round(_.sumBy(weekendTxns, "amount"));
  const weekdayTotal = Math.round(_.sumBy(weekdayTxns, "amount"));

  const uniqueDates = [...new Set(expenses.map(t => t.date))];
  const wkendDays = uniqueDates.filter(d => { const day = new Date(d).getDay(); return day === 0 || day === 6; }).length;
  const wkdayDays = uniqueDates.length - wkendDays;
  const avgWeekendPerDay = wkendDays > 0 ? Math.round(weekendTotal / wkendDays) : 0;
  const avgWeekdayPerDay = wkdayDays > 0 ? Math.round(weekdayTotal / wkdayDays) : 0;

  const highestCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  // Anomaly detection — multi-signal, user-confirmable
  const outliers = detectAnomalies(expenses);

  // Subscription detection: a known service (keyword or "Subscriptions" category),
  // OR ANY merchant charging a near-fixed amount across 2+ different months — so
  // real recurring bills (gym, SaaS, local OTT, etc.) are caught, not just a keyword list.
  const NON_SUB_CATS = new Set(["Rent", "EMI", "Salary", "Freelance Income", "Groceries", "Fuel", "Transfers", "Investments", "Savings"]);
  const subByMerchant = {};
  const byMerchant = {};
  expenses.forEach(t => { (byMerchant[t.merchant] = byMerchant[t.merchant] || []).push(t); });
  Object.entries(byMerchant).forEach(([merchant, txns]) => {
    const lower = merchant.toLowerCase();
    const isKeyword = SUB_KEYWORDS.some(s => lower.includes(s));
    const isTagged  = txns.some(t => t.category === "Subscriptions");
    let recurringAmount = null;
    for (const t of txns) {
      if (NON_SUB_CATS.has(t.category)) continue; // rent/EMI/groceries recur but aren't subscriptions
      const tol = Math.max(t.amount * 0.05, 10); // near-fixed amount (within 5% or ₹10)
      const months = new Set(txns.filter(o => Math.abs(o.amount - t.amount) <= tol).map(o => o.date.slice(0, 7)));
      if (months.size >= 2) { recurringAmount = t.amount; break; }
    }
    if (isKeyword || isTagged || recurringAmount != null) {
      const latest = txns.reduce((a, b) => (b.date > a.date ? b : a));
      subByMerchant[merchant] = {
        merchant,
        amount: Math.round(recurringAmount != null ? recurringAmount : latest.amount),
        date: latest.date,
        months: new Set(txns.map(t => t.date.slice(0, 7))).size,
      };
    }
  });
  const subscriptions = Object.values(subByMerchant).sort((a, b) => b.amount - a.amount);
  const subscriptionCost = Math.round(_.sumBy(subscriptions, "amount"));

  // Recurring detection (same merchant + amount 2+ times)
  const recurringMap = {};
  expenses.forEach(t => {
    const k = `${t.merchant}::${t.amount}`;
    recurringMap[k] = (recurringMap[k] || 0) + 1;
  });
  const recurring = Object.entries(recurringMap).filter(([, c]) => c >= 2).map(([k]) => k.split("::")[0]);

  // Prediction — recency-weighted average of monthly totals (recent months weigh more)
  const monthVals = allMonths.map(m => monthlyMap[m] || 0).filter(v => v > 0);
  let predictedNextMonth;
  if (monthVals.length >= 2) {
    let wSum = 0, w = 0;
    monthVals.forEach((v, i) => { const weight = i + 1; wSum += v * weight; w += weight; });
    predictedNextMonth = Math.round(wSum / w);
  } else {
    predictedNextMonth = Math.round(total);
  }

  // Health score — additive components so the breakdown is explainable
  const scoreParts = [];
  let healthScore = 50;
  if (totalIncome > 0) {
    if (savingsRate >= 30)      { healthScore += 25; scoreParts.push({ label: "Savings rate above 30%", delta: +25 }); }
    else if (savingsRate >= 15) { healthScore += 15; scoreParts.push({ label: "Savings rate above 15%", delta: +15 }); }
    else if (savingsRate >= 5)  { healthScore += 5;  scoreParts.push({ label: "Positive savings rate", delta: +5 }); }
    else if (netSavings < 0)    { healthScore -= 25; scoreParts.push({ label: "Spending exceeds income", delta: -25 }); }
  }
  if (total > 0) {
    const foodShare = (catTotals.Food || 0) / total;
    const shopShare = (catTotals.Shopping || 0) / total;
    if (foodShare > 0.20)  { healthScore -= 10; scoreParts.push({ label: "Food above 20% of spend", delta: -10 }); }
    if (shopShare > 0.30)  { healthScore -= 10; scoreParts.push({ label: "Shopping above 30% of spend", delta: -10 }); }
    if (outliers.length > 3)      { healthScore -= 8; scoreParts.push({ label: `${outliers.length} unusual transactions`, delta: -8 }); }
    if (subscriptions.length > 4) { healthScore -= 5; scoreParts.push({ label: `${subscriptions.length} active subscriptions`, delta: -5 }); }
    if (avgWeekendPerDay > avgWeekdayPerDay * 1.5 && weekendTotal > 0) { healthScore -= 4; scoreParts.push({ label: "Heavy weekend spending", delta: -4 }); }
    if (totalSaved + totalInvested > 0) { healthScore += 10; scoreParts.push({ label: "Active savings or investments", delta: +10 }); }
  }
  healthScore = Math.max(5, Math.min(100, Math.round(healthScore)));

  // Warnings
  const warnings = [];
  if (total > 0) {
    if ((catTotals.Food || 0) / total > 0.15)     warnings.push({ type: "Food", severity: "medium", message: `Food is ${Math.round((catTotals.Food || 0) / total * 100)}% of total spending — above the 15% benchmark.` });
    if ((catTotals.Shopping || 0) / total > 0.25) warnings.push({ type: "Shopping", severity: "high", message: `Shopping is ${Math.round((catTotals.Shopping || 0) / total * 100)}% of spending — your highest discretionary category.` });
    if (subscriptionCost >= 500)                  warnings.push({ type: "Subscriptions", severity: "medium", message: `${subscriptions.length} subscriptions cost ₹${subscriptionCost.toLocaleString("en-IN")}/month (₹${(subscriptionCost * 12).toLocaleString("en-IN")}/year).` });
    if (avgWeekendPerDay > avgWeekdayPerDay * 1.2 && weekendTotal > 0) warnings.push({ type: "Weekend Spike", severity: "low", message: `Weekend average ₹${avgWeekendPerDay.toLocaleString("en-IN")}/day vs weekday ₹${avgWeekdayPerDay.toLocaleString("en-IN")}/day.` });
    if (outliers.length > 0)                      warnings.push({ type: "Anomalies", severity: "high", message: `${outliers.length} statistically unusual transaction(s) flagged for review.` });
    if (netSavings < 0 && totalIncome > 0)        warnings.push({ type: "Negative Cash Flow", severity: "high", message: `Expenses exceed income by ₹${Math.abs(netSavings).toLocaleString("en-IN")} in this period.` });
    if (totalIncome === 0)                        warnings.push({ type: "No Income Recorded", severity: "low", message: "No income transactions found — savings rate cannot be computed. Add income for full analysis." });
  }

  // Budget tracking (current month) + carry-forward from last month
  let budget = null;
  if (options.monthlyBudget > 0) {
    const nowMonth  = new Date().toISOString().slice(0, 7);
    const prevDate  = new Date(); prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);
    const spentThisMonth = Math.round(monthlyMap[nowMonth] || 0);
    const spentPrevMonth = Math.round(monthlyMap[prevMonth] || 0);
    const carryForward   = monthlyMap[prevMonth] !== undefined
      ? Math.max(Math.round(options.monthlyBudget - spentPrevMonth), 0)
      : 0;
    const available = options.monthlyBudget + carryForward;
    budget = {
      monthly: options.monthlyBudget,
      carryForward,
      available,
      spentThisMonth,
      remaining: Math.round(available - spentThisMonth),
      usedPct: Math.min(Math.round((spentThisMonth / available) * 100), 100),
      exceeded: spentThisMonth > available,
    };
    if (budget.exceeded) warnings.unshift({ type: "Budget Exceeded", severity: "high", message: `You have spent ₹${spentThisMonth.toLocaleString("en-IN")} of your ₹${available.toLocaleString("en-IN")} available budget this month.` });
    else if (budget.usedPct >= 90) warnings.unshift({ type: "Budget Alert", severity: "medium", message: `${budget.usedPct}% of this month's budget used. ₹${budget.remaining.toLocaleString("en-IN")} remaining.` });
  }

  return {
    total, totalIncome, totalSaved, totalInvested, netSavings, savingsRate, expenseRatio,
    mean, median, max, min,
    totalTransactions: transactions.length,
    avgDaily: uniqueDates.length ? Math.round(total / uniqueDates.length) : 0,
    highestCategory: highestCat ? { name: highestCat[0], amount: highestCat[1] } : null,
    catTotals, dailyTrend, weeklyTrend, monthlyTrend, topMerchants,
    weekendTotal, weekdayTotal, avgWeekendPerDay, avgWeekdayPerDay,
    outliers, subscriptions, subscriptionCost, recurring,
    predictedNextMonth, healthScore, scoreParts, warnings, budget,
  };
}

function generateRecommendations(analytics, priority, customGoal) {
  if (!analytics) return { recommendations: [], totalMonthlySaving: 0, totalYearlySaving: 0 };

  const { catTotals, total, subscriptionCost, subscriptions, avgWeekendPerDay, avgWeekdayPerDay } = analytics;
  const recs = [];
  const goalLabel = priority === "Others" ? (customGoal || "Custom Goal") : priority;

  const food          = catTotals.Food || 0;
  const travel        = catTotals.Travel || 0;
  const shopping      = catTotals.Shopping || 0;
  const entertainment = catTotals.Entertainment || 0;
  const groceries     = catTotals.Groceries || 0;

  if (total === 0) return { priority: goalLabel, recommendations: [], totalMonthlySaving: 0, totalYearlySaving: 0 };

  if (shopping / total > 0.20) recs.push({ tag: "Shopping", title: "Cut shopping by 20%", reason: `₹${shopping.toLocaleString("en-IN")} spent on shopping (${Math.round(shopping / total * 100)}% of total). Apply the 48-hour rule before non-essential purchases.`, monthlySaving: Math.round(shopping * 0.20) });
  if (food / total > 0.10) recs.push({ tag: "Food", title: "Reduce food delivery by 15%", reason: `₹${food.toLocaleString("en-IN")} on food. Cooking 3 extra meals per week meaningfully lowers this without lifestyle loss.`, monthlySaving: Math.round(food * 0.15) });
  if (subscriptionCost >= 500) recs.push({ tag: "Subscriptions", title: `Audit ${subscriptions?.length || ""} subscriptions`, reason: `₹${subscriptionCost.toLocaleString("en-IN")}/month recurring. Cancelling the least-used service saves ₹${Math.round(subscriptionCost * 0.33).toLocaleString("en-IN")}/month.`, monthlySaving: Math.round(subscriptionCost * 0.33) });
  if (groceries > 10000) recs.push({ tag: "Groceries", title: "Plan weekly grocery shopping", reason: `₹${groceries.toLocaleString("en-IN")} on groceries. Weekly meal planning and bulk buying typically reduces this by 10%.`, monthlySaving: Math.round(groceries * 0.10) });
  if (avgWeekendPerDay > avgWeekdayPerDay * 1.4 && avgWeekendPerDay > 0) recs.push({ tag: "Weekend", title: "Set a weekend spending cap", reason: `Weekend spending averages ₹${avgWeekendPerDay.toLocaleString("en-IN")}/day vs ₹${avgWeekdayPerDay.toLocaleString("en-IN")} on weekdays. A cap at weekday levels saves the difference.`, monthlySaving: Math.round((avgWeekendPerDay - avgWeekdayPerDay) * 8 * 0.6) });

  // Priority-specific recommendations — every priority always yields something
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  switch (priority) {
    case "Savings":
      recs.push({ tag: "Automate", title: "Automate savings on payday", reason: `Set a standing transfer of ${inr(Math.max(total * 0.10, 500))} (10% of your spend level) to a separate account on salary day — saving before spending beats saving what's left.`, monthlySaving: Math.round(Math.max(total * 0.10, 500)) });
      if (travel > 2000) recs.push({ tag: "Travel", title: "Switch routine commutes to metro", reason: `Metro fares are roughly half of ride-hailing. On ${inr(travel)} of travel spend, ~30% is recoverable.`, monthlySaving: Math.round(travel * 0.3) });
      break;
    case "Food":
      recs.push({ tag: "FoodPlan", title: food > 0 ? "Set a weekly food allowance" : "Track food spending first", reason: food > 0 ? `You spend ${inr(food)} on food. A weekly cap of ${inr(food * 0.85 / 4.3)} keeps quality while trimming 15%.` : "No food transactions recorded yet — categorise your eateries so I can find savings here.", monthlySaving: Math.round(food * 0.15) });
      break;
    case "Health":
      recs.push({ tag: "Health", title: "Fund health from entertainment", reason: entertainment > 0 ? `${inr(entertainment)} on entertainment could partly fund a gym membership or an annual health checkup (~₹1,500–2,500).` : "A preventive annual health checkup (~₹1,500–2,500) is the cheapest health insurance there is — budget for it this month.", monthlySaving: Math.round(entertainment * 0.4) });
      break;
    case "Travel":
      recs.push({ tag: "Travel", title: travel > 0 ? "Optimise routine travel" : "Start a travel fund", reason: travel > 0 ? `${inr(travel)} on travel. Metro or bus for routine trips recovers ~30%; book intercity tickets 3+ weeks ahead for 20–40% lower fares.` : `No travel spend recorded. Putting aside ${inr(Math.max(total * 0.05, 500))}/month builds a trip fund without touching your budget.`, monthlySaving: Math.round(travel > 0 ? travel * 0.3 : 0) });
      break;
    case "Shopping":
      recs.push({ tag: "Shop48", title: "Apply the 48-hour rule", reason: shopping > 0 ? `You spent ${inr(shopping)} on shopping. Waiting 48 hours before any non-essential purchase typically cuts impulse buys by ~20%.` : "Shopping spend is already minimal — keep wishlist items in the cart for 48 hours before buying to stay that way.", monthlySaving: Math.round(shopping * 0.20) });
      if (shopping > 0) recs.push({ tag: "ShopTime", title: "Buy during sale windows", reason: "Batching purchases into the big sale events (typically Jan, May, Oct) saves 10–15% on the same items versus buying on impulse.", monthlySaving: Math.round(shopping * 0.10) });
      break;
    case "Education":
      recs.push({ tag: "Education", title: "Swap one streaming service for a learning platform", reason: "Replacing one ₹650/month streaming subscription with a course platform converts passive spend into career value.", monthlySaving: 200 });
      break;
    case "Family":
      recs.push({ tag: "Family", title: "Create a family envelope budget", reason: `Group household categories (groceries ${inr(groceries)}, utilities, rent) into one envelope with a fixed monthly limit — shared visibility cuts duplicate spending by ~8%.`, monthlySaving: Math.round((groceries + (catTotals.Utilities || 0)) * 0.08) });
      recs.push({ tag: "FamilyEmg", title: "Build a 3-month emergency fund", reason: `Your essential monthly spend is roughly ${inr(total)}. A ${inr(total * 3)} emergency fund protects the family from income shocks — start with 5% a month.`, monthlySaving: 0 });
      break;
    case "Entertainment":
      recs.push({ tag: "Entertainment", title: "Cap entertainment at 5% of spend", reason: entertainment > 0 ? `Entertainment is ${inr(entertainment)} (${Math.round(entertainment / total * 100)}% of spend). A 5% cap (${inr(total * 0.05)}) keeps fun sustainable.` : "Entertainment spend is minimal — rotate one subscription at a time instead of stacking them to keep it that way.", monthlySaving: Math.round(Math.max(entertainment - total * 0.05, 0)) });
      break;
    case "Others":
      if (customGoal) { const pot = Math.round(shopping * 0.15 + food * 0.10 + entertainment * 0.30); recs.push({ tag: "Goal", title: `Save towards: ${customGoal}`, reason: pot > 0 ? `Trimming shopping 15%, food 10%, and entertainment 30% frees ${inr(pot)}/month for this goal.` : `Set up a fixed monthly transfer towards "${customGoal}" — even ${inr(500)}/month compounds.`, monthlySaving: Math.max(pot, 500) }); }
      else recs.push({ tag: "Goal", title: "Describe your goal above", reason: "Type what you're saving for (a laptop, a trip, an emergency fund) and I'll build a plan from your spending pattern.", monthlySaving: 0 });
      break;
  }

  const seen = new Set();
  const unique = recs.filter(r => { if (seen.has(r.tag)) return false; seen.add(r.tag); return true; });

  // Never return an empty list — fall back to trimming the top category
  if (!unique.length) {
    const [topCat, topAmt] = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0] || ["spending", total];
    unique.push({ tag: "General", title: `Trim ${topCat} by 10%`, reason: `${topCat} is your largest category at ${inr(topAmt)}. A 10% reduction is usually achievable without lifestyle changes.`, monthlySaving: Math.round(topAmt * 0.10) });
  }
  const totalSaving = unique.reduce((s, r) => s + r.monthlySaving, 0);

  return { priority: goalLabel, recommendations: unique.map(r => ({ ...r, yearlySaving: r.monthlySaving * 12 })), totalMonthlySaving: totalSaving, totalYearlySaving: totalSaving * 12 };
}

/**
 * Rule-based financial assistant. Answers natural-language questions
 * from the computed analytics — no external AI service required.
 *
 * Two layers:
 *  1. Specialised intents (health score, budget, forecast, comparisons…)
 *  2. A filter engine that extracts entities from the question — merchant,
 *     category, payment method, month, weekend, type — and aggregates the
 *     user's transactions over any combination of them. This is what answers
 *     "how much did I pay by cash at Zomato in March?".
 */
const PAY_METHODS_MAP = [
  ["credit card", "Card"], ["debit card", "Card"], ["net banking", "NetBanking"],
  ["netbanking", "NetBanking"], ["wallet", "Wallet"], ["cash", "Cash"],
  ["upi", "UPI"], ["card", "Card"],
];
const MONTH_NAMES = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function answerQuestion(question, analytics, goals = [], transactions = []) {
  if (!analytics) return { answer: "I don't have any transaction data yet. Upload a statement or add transactions, then ask me again.", facts: [] };
  const q = (question || "").toLowerCase();
  const { catTotals, total, totalIncome, netSavings, savingsRate, healthScore, scoreParts, subscriptions, subscriptionCost, outliers, predictedNextMonth, avgDaily, budget, monthlyTrend, recurring } = analytics;
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const squash = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const qSquashed = squash(q);
  const expenses = transactions.filter(t => t.type === "expense" || !t.type);

  // ── Capabilities / greeting ─────────────────────────────────
  if (/^(hi|hello|hey)\b/.test(q.trim()) || /what can (you|i) (do|ask)|^help\b/.test(q)) {
    return {
      answer: "I answer from your own transaction data. Try: \"How much did I pay by cash?\", \"Spending at Zomato in March?\", \"What was my biggest payment?\", \"Did I spend more this month than last?\", \"How much did I receive?\", \"Why is my health score low?\", or \"How can I save more?\"",
      facts: [{ label: "Transactions", value: String(analytics.totalTransactions) }, { label: "Period spend", value: inr(total) }],
    };
  }

  // ── This month vs last month comparison ─────────────────────
  if (/(more|less|higher|lower|compare|versus|vs).*(last|previous) month|month over month|spending trend/.test(q) && (monthlyTrend || []).length >= 2) {
    const cur = monthlyTrend[monthlyTrend.length - 1];
    const prev = monthlyTrend[monthlyTrend.length - 2];
    const diff = cur.amount - prev.amount;
    const pct = prev.amount > 0 ? Math.round(Math.abs(diff) / prev.amount * 100) : 0;
    return {
      answer: `In ${cur.month} you spent ${inr(cur.amount)} vs ${inr(prev.amount)} in ${prev.month} — that is ${inr(Math.abs(diff))} (${pct}%) ${diff >= 0 ? "more" : "less"}.${diff > 0 && pct > 20 ? " Worth checking which category drove the jump." : ""}`,
      facts: [{ label: cur.month, value: inr(cur.amount) }, { label: prev.month, value: inr(prev.amount) }, { label: "Change", value: `${diff >= 0 ? "+" : "-"}${inr(Math.abs(diff))}` }],
    };
  }

  // ── Biggest / smallest single transaction ───────────────────
  if (/(biggest|largest|highest|most expensive|max)\b/.test(q) && /payment|transaction|purchase|expense|spend|txn/.test(q) && !/category/.test(q)) {
    const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
    if (top.length) return {
      answer: `Your biggest payment is ${inr(top[0].amount)} to ${top[0].merchant} on ${top[0].date} (${top[0].category}).${top[1] ? ` Next: ${top[1].merchant} at ${inr(top[1].amount)}${top[2] ? ` and ${top[2].merchant} at ${inr(top[2].amount)}` : ""}.` : ""}`,
      facts: top.map(t => ({ label: t.merchant, value: `${inr(t.amount)} · ${t.date}` })),
    };
  }
  if (/(smallest|cheapest|lowest|min)\b/.test(q) && /payment|transaction|purchase|expense|spend/.test(q)) {
    const low = [...expenses].sort((a, b) => a.amount - b.amount)[0];
    if (low) return {
      answer: `Your smallest payment is ${inr(low.amount)} to ${low.merchant} on ${low.date}.`,
      facts: [{ label: low.merchant, value: `${inr(low.amount)} · ${low.date}` }],
    };
  }

  // ── Top merchants ────────────────────────────────────────────
  if (/top merchant|who do i pay|where do i (spend|pay) (the )?most|most paid/.test(q)) {
    const tm = analytics.topMerchants.slice(0, 5);
    return {
      answer: `You pay the most to ${tm[0].merchant} (${inr(tm[0].amount)})${tm[1] ? `, then ${tm[1].merchant} (${inr(tm[1].amount)})` : ""}${tm[2] ? ` and ${tm[2].merchant} (${inr(tm[2].amount)})` : ""}.`,
      facts: tm.map(m => ({ label: m.merchant, value: inr(m.amount) })),
    };
  }

  // ── Recurring payments ───────────────────────────────────────
  if (/recurring|repeat(ed)? payment|regular payment/.test(q)) {
    return {
      answer: (recurring || []).length
        ? `${recurring.length} merchants charge you repeatedly (same merchant, same amount): ${recurring.slice(0, 5).join(", ")}${recurring.length > 5 ? ` and ${recurring.length - 5} more` : ""}.`
        : "No repeated same-amount payments detected.",
      facts: (recurring || []).slice(0, 5).map(m => ({ label: "Recurring", value: m })),
    };
  }

  // ── Net savings ("how much did I save?") ────────────────────
  if (/how much.*(did|have|do) i sav|net saving|saved this|my savings\b/.test(q)) {
    return {
      answer: totalIncome > 0
        ? `You ${netSavings >= 0 ? "saved" : "overspent by"} ${inr(Math.abs(netSavings))} this period — income ${inr(totalIncome)} minus expenses ${inr(total)} (${savingsRate}% savings rate).`
        : `No income is recorded in this period, so savings can't be computed. You spent ${inr(total)} in total.`,
      facts: [{ label: "Income", value: inr(totalIncome) }, { label: "Spent", value: inr(total) }, { label: "Net", value: inr(netSavings) }],
    };
  }

  if (/overspend|spend(ing)? too much|where.*money|biggest.*category|most.*spend/.test(q)) {
    const [cat, amt] = topCats[0] || ["—", 0];
    const second = topCats[1];
    return {
      answer: `Your largest spending category is ${cat} at ${inr(amt)} (${Math.round(amt / total * 100)}% of total spend)${second ? `, followed by ${second[0]} at ${inr(second[1])}` : ""}. ${amt / total > 0.25 ? "That share is high — capping it should be your first lever." : "The distribution looks reasonably balanced."}`,
      facts: topCats.slice(0, 4).map(([c, a]) => ({ label: c, value: inr(a) })),
    };
  }
  if (/save more|how.*save|increase.*saving|improve.*saving/.test(q)) {
    const recs = generateRecommendations(analytics, "Savings", "");
    const top = recs.recommendations.slice(0, 3);
    return {
      answer: top.length
        ? `Three highest-impact moves: ${top.map(r => `${r.title.toLowerCase()} (saves ${inr(r.monthlySaving)}/month)`).join("; ")}. Together that is ${inr(top.reduce((s, r) => s + r.monthlySaving, 0))}/month.`
        : "Your spending is already lean relative to the patterns I can see. The next lever is increasing income or automating a fixed transfer to savings on payday.",
      facts: top.map(r => ({ label: r.tag, value: inr(r.monthlySaving) + "/mo" })),
    };
  }
  if (/health score|score low|why.*score/.test(q)) {
    const negatives = (scoreParts || []).filter(p => p.delta < 0);
    const positives = (scoreParts || []).filter(p => p.delta > 0);
    return {
      answer: `Your health score is ${healthScore}/100. ${negatives.length ? "It is being pulled down by: " + negatives.map(p => p.label.toLowerCase()).join(", ") + "." : "No major negatives detected."} ${positives.length ? "Working in your favour: " + positives.map(p => p.label.toLowerCase()).join(", ") + "." : ""}`,
      facts: (scoreParts || []).map(p => ({ label: p.label, value: (p.delta > 0 ? "+" : "") + p.delta })),
    };
  }
  if (/budget|affect.*budget|category.*budget/.test(q)) {
    const [cat, amt] = topCats[0] || ["—", 0];
    return {
      answer: budget
        ? `You've used ${budget.usedPct}% of this month's available budget (${inr(budget.spentThisMonth)} of ${inr(budget.available)}${budget.carryForward ? `, including ${inr(budget.carryForward)} carried forward` : ""}). The category hitting it hardest is ${cat} at ${inr(amt)}.`
        : `You haven't set a monthly budget yet — set one in Settings to track usage. Your biggest category is ${cat} at ${inr(amt)}, which is where a budget would bite first.`,
      facts: budget ? [{ label: "Spent", value: inr(budget.spentThisMonth) }, { label: "Available", value: inr(budget.available) }, { label: "Remaining", value: inr(budget.remaining) }] : [],
    };
  }
  if (/subscription/.test(q)) {
    return {
      answer: subscriptions.length
        ? `You have ${subscriptions.length} detected subscriptions costing ${inr(subscriptionCost)}/month — that is ${inr(subscriptionCost * 12)}/year. ${subscriptions.length > 3 ? "Consider cancelling the one you used least this month." : ""}`
        : "No recurring subscriptions detected in your data.",
      facts: subscriptions.slice(0, 5).map(s => ({ label: s.merchant, value: inr(s.amount) + "/mo" })),
    };
  }
  if (/unusual|outlier|anomal|suspicious/.test(q)) {
    return {
      answer: outliers.length
        ? `${outliers.length} transactions look statistically unusual. The largest is ${outliers[0].merchant} at ${inr(outliers[0].amount)} on ${outliers[0].date}. If these were expected, confirm them on the dashboard so they stop affecting your score.`
        : "No anomalous transactions detected — your spending pattern is consistent.",
      facts: outliers.slice(0, 4).map(o => ({ label: o.merchant, value: inr(o.amount) })),
    };
  }
  if (/predict|forecast|next month/.test(q)) {
    return {
      answer: `Based on a recency-weighted average of your monthly spending, next month is projected at ${inr(predictedNextMonth)}. Your current daily average is ${inr(avgDaily)}.`,
      facts: [{ label: "Forecast", value: inr(predictedNextMonth) }, { label: "Daily avg", value: inr(avgDaily) }],
    };
  }
  if (/goal/.test(q) && goals.length) {
    const active = goals.filter(g => g.status === "active");
    return {
      answer: active.length
        ? `You have ${active.length} active goal(s). ${active.map(g => `${g.title}: ${Math.round(g.savedAmount / g.targetAmount * 100)}% funded (${inr(g.targetAmount - g.savedAmount)} to go)`).join(". ")}.`
        : "All your goals are completed or paused. Create a new one to keep momentum.",
      facts: active.slice(0, 3).map(g => ({ label: g.title, value: Math.round(g.savedAmount / g.targetAmount * 100) + "%" })),
    };
  }

  // ── Filter engine ────────────────────────────────────────────
  // Extract entities and aggregate over any combination of them.
  const filters = [];
  let list = transactions;

  // Payment method ("paid by cash", "upi payments")
  const methodHit = PAY_METHODS_MAP.find(([k]) => q.includes(k));
  if (methodHit) {
    list = list.filter(t => (t.paymentMethod || "").toLowerCase() === methodHit[1].toLowerCase());
    filters.push(`paid by ${methodHit[1]}`);
  }

  // Merchant (squashed substring so "imagica world" matches "Imagicaaworld")
  const merchants = [...new Set(transactions.map(t => t.merchant))];
  const hitMerchant = merchants
    .filter(m => squash(m).length >= 4 && qSquashed.includes(squash(m)))
    .sort((a, b) => squash(b).length - squash(a).length)[0];
  if (hitMerchant) {
    list = list.filter(t => t.merchant === hitMerchant);
    filters.push(`at ${hitMerchant}`);
  }

  // Category
  const hitCat = Object.keys(catTotals)
    .filter(c => qSquashed.includes(squash(c)))
    .sort((a, b) => b.length - a.length)[0];
  if (hitCat && !hitMerchant) {
    list = list.filter(t => t.category === hitCat);
    filters.push(`in ${hitCat}`);
  }

  // Month ("in march", "march 2026", "last month", "this month")
  let monthPrefix = null, monthLabel = null;
  const now = new Date();
  if (/this month/.test(q)) {
    monthPrefix = now.toISOString().slice(0, 7); monthLabel = "this month";
  } else if (/last month|previous month/.test(q)) {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    monthPrefix = d.toISOString().slice(0, 7); monthLabel = "last month";
  } else {
    const mWord = Object.keys(MONTH_NAMES).filter(m => new RegExp(`\\b${m}\\b`).test(q)).sort((a, b) => b.length - a.length)[0];
    if (mWord) {
      const mm = String(MONTH_NAMES[mWord]).padStart(2, "0");
      const yearMatch = q.match(/\b(20\d{2})\b/);
      let year = yearMatch ? yearMatch[1] : null;
      if (!year) {
        // Use the most recent year that actually has data for this month
        const years = [...new Set(transactions.filter(t => String(t.date).slice(5, 7) === mm).map(t => String(t.date).slice(0, 4)))].sort();
        year = years[years.length - 1] || String(now.getFullYear());
      }
      monthPrefix = `${year}-${mm}`; monthLabel = `${mWord[0].toUpperCase()}${mWord.slice(1)} ${year}`;
    }
  }
  if (monthPrefix) {
    list = list.filter(t => String(t.date).startsWith(monthPrefix));
    filters.push(monthLabel);
  }

  // Weekend / weekday
  if (/weekend/.test(q)) { list = list.filter(t => t.dayOfWeek === 0 || t.dayOfWeek === 6); filters.push("on weekends"); }
  else if (/weekday/.test(q)) { list = list.filter(t => t.dayOfWeek > 0 && t.dayOfWeek < 6); filters.push("on weekdays"); }

  // Yesterday / today
  if (/yesterday/.test(q)) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const iso = d.toISOString().slice(0, 10);
    list = list.filter(t => String(t.date).startsWith(iso)); filters.push("yesterday");
  } else if (/\btoday\b/.test(q)) {
    const iso = now.toISOString().slice(0, 10);
    list = list.filter(t => String(t.date).startsWith(iso)); filters.push("today");
  }

  // Type: income vs expense vs transfer
  const wantsIncome = /receiv|income|earn|credited|got paid/.test(q);
  const wantsTransfer = /\btransfer/.test(q);
  if (wantsIncome) { list = list.filter(t => t.type === "income"); filters.push("received"); }
  else if (wantsTransfer) { list = list.filter(t => t.type === "transfer"); filters.push("transfers"); }
  else if (filters.length || /spen[dt]|paid|pay|cost|much|many|total/.test(q)) {
    // Default money questions to expenses. For a merchant, keep both directions
    // unless the user explicitly asked about spending/paying.
    if (!hitMerchant || /spen[dt]|paid|pay\b|cost/.test(q)) list = list.filter(t => t.type === "expense" || !t.type);
  }

  if (filters.length) {
    if (!list.length) {
      const noMethodCount = methodHit ? transactions.filter(t => !t.paymentMethod).length : 0;
      return {
        answer: `No transactions found ${filters.join(", ")}.${noMethodCount > 0 ? ` Note: ${noMethodCount} of your transactions don't record a payment method (statement imports only capture it when the source provides it) — edit a transaction to set it.` : " Try a different period, merchant, or category."}`,
        facts: [],
      };
    }
    const sum = list.reduce((s, t) => s + t.amount, 0);
    const sorted = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const biggest = [...list].sort((a, b) => b.amount - a.amount)[0];
    const wantsCount = /how many|count|number of/.test(q);
    const label = filters.join(", ");
    return {
      answer: wantsCount
        ? `${list.length} transaction${list.length > 1 ? "s" : ""} ${label}, totalling ${inr(sum)}. The most recent was ${inr(sorted[0].amount)} at ${sorted[0].merchant} on ${sorted[0].date}.`
        : `${inr(sum)} across ${list.length} transaction${list.length > 1 ? "s" : ""} ${label} (average ${inr(sum / list.length)}). Largest: ${inr(biggest.amount)} at ${biggest.merchant} on ${biggest.date}.`,
      facts: [
        { label: "Total", value: inr(sum) },
        { label: "Transactions", value: String(list.length) },
        { label: "Average", value: inr(sum / list.length) },
        { label: "Largest", value: `${inr(biggest.amount)} · ${biggest.merchant}` },
      ],
    };
  }

  // Overall counts — "how many transactions did I make?"
  if (/how many|number of|count of/.test(q) && /transaction|payment|times|txn/.test(q)) {
    const byType = {};
    transactions.forEach(t => { const ty = t.type || "expense"; byType[ty] = (byType[ty] || 0) + 1; });
    return {
      answer: `${transactions.length} transactions in this period: ${Object.entries(byType).map(([ty, c]) => `${c} ${ty}`).join(", ")}.`,
      facts: Object.entries(byType).map(([ty, c]) => ({ label: ty, value: String(c) })),
    };
  }

  // Default: financial summary + what to ask
  return {
    answer: `Period summary: ${inr(total)} spent across ${analytics.totalTransactions} transactions${totalIncome ? `, ${inr(totalIncome)} income (${savingsRate}% savings rate)` : ""}. Health score ${healthScore}/100. You can ask things like "how much did I pay by cash", "spending at Zomato in March", "biggest payment", "did I spend more this month than last", or "why is my health score low".`,
    facts: [{ label: "Spent", value: inr(total) }, { label: "Income", value: inr(totalIncome) }, { label: "Net", value: inr(netSavings) }],
  };
}

module.exports = { computeAnalytics, generateRecommendations, answerQuestion, detectAnomalies };
