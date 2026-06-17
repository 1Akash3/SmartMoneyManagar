// Smarter AI assistant — a thin Claude layer over the user's own analytics.
//
// Design goals (user asked for "smarter answers but not too late"):
//   • Smarter  → a real LLM answers in natural language, grounded ONLY in the
//                user's computed analytics + a capped sample of their txns.
//   • Not too late → a fast model, thinking omitted, small max_tokens, and a
//                hard client timeout. On any failure it returns null so the
//                caller falls back to the instant rule-based engine.
//   • Private  → only an aggregated summary + a recent-transaction sample is
//                sent (never the whole history), and only when a key is set.
//
// Activates only when ANTHROPIC_API_KEY is present, so the app runs exactly as
// before until you add the key on Render. Model is configurable via AI_MODEL
// (default claude-haiku-4-5 — lowest latency; set claude-sonnet-4-6 for even
// smarter answers at slightly higher latency, or claude-opus-4-8 for the most
// capable).

let Anthropic = null;
try { Anthropic = require("@anthropic-ai/sdk"); } catch { /* SDK not installed → stay disabled */ }

const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";

// One shared client. 20s timeout + a single retry: a slow/cold LLM call must
// not hang the request — we'd rather fall back to the instant rule-based answer.
const client = (Anthropic && process.env.ANTHROPIC_API_KEY)
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20000, maxRetries: 1 })
  : null;

const isLLMEnabled = () => !!client;

const CURRENCY_SYMBOL = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

// Compact, token-light snapshot of the user's finances for the model to reason
// over. Aggregates come from computeAnalytics; we also attach a capped sample of
// recent transactions so merchant/method/period questions can be answered.
function buildContext({ analytics, transactions, goals, currency }) {
  const a = analytics || {};
  const recent = [...transactions]
    .sort((x, y) => String(y.date).localeCompare(String(x.date)))
    .slice(0, 80)
    .map(t => ({
      date: t.date,
      merchant: t.merchant,
      amount: Math.round(t.amount),
      category: t.category,
      type: t.type || "expense",
      method: t.paymentMethod || null,
    }));

  return {
    currency,
    summary: {
      totalSpent: a.total,
      totalIncome: a.totalIncome,
      netSavings: a.netSavings,
      savingsRate: a.savingsRate,
      healthScore: a.healthScore,
      healthScoreBreakdown: a.scoreParts,
      avgDaily: a.avgDaily,
      predictedNextMonth: a.predictedNextMonth,
      totalTransactions: a.totalTransactions,
    },
    categoryTotals: a.catTotals,
    topMerchants: a.topMerchants,
    subscriptions: a.subscriptions,
    subscriptionMonthlyCost: a.subscriptionCost,
    monthlyTrend: a.monthlyTrend,
    budget: a.budget,
    unusualTransactions: a.outliers,
    goals: (goals || []).map(g => ({
      title: g.title, target: g.targetAmount, saved: g.savedAmount, status: g.status,
    })),
    recentTransactions: recent,
    transactionsTruncated: transactions.length > recent.length
      ? `Only the ${recent.length} most recent of ${transactions.length} transactions are listed; use the aggregates above for full-period totals.`
      : undefined,
  };
}

// Returns a natural-language answer string, or null to signal "use the
// rule-based fallback" (no key, error, timeout, refusal, or empty output).
async function askLLM(question, ctx) {
  if (!client) return null;

  const symbol = CURRENCY_SYMBOL[ctx.currency] || ctx.currency || "₹";
  const system =
    "You are SpendSmart's personal-finance assistant. Answer the user's question using ONLY the JSON data provided about their own finances.\n" +
    `- All amounts are in ${ctx.currency || "INR"}; format money with the ${symbol} symbol and thousands separators.\n` +
    "- Be concise and direct: 1–4 short sentences of plain text. No markdown headings, no bullet characters, no preamble like \"Based on your data\".\n" +
    "- Ground every figure in the data. Prefer the aggregated summary/categoryTotals for period totals; use recentTransactions for specific merchants, methods, or dates.\n" +
    "- If the data doesn't contain what's needed, say so plainly and suggest what to add or ask — do not guess or invent transactions, amounts, or categories.\n" +
    "- Give specific, useful observations (which category or merchant drives spend, what to trim). Avoid generic disclaimers and regulated investment advice.";

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system,
    messages: [{
      role: "user",
      content: `Here is the user's financial data as JSON:\n${JSON.stringify(buildContext(ctx))}\n\nUser question: ${question}`,
    }],
  });

  if (msg.stop_reason === "refusal") return null;
  const text = (msg.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();
  return text || null;
}

module.exports = { askLLM, isLLMEnabled, MODEL };
