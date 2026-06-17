const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const dal     = require("../utils/dal");
const { computeAnalytics, answerQuestion } = require("../utils/analytics");
const { askLLM, isLLMEnabled } = require("../utils/aiAssistant");

// AI Financial Assistant. The rule-based engine (answerQuestion) computes exact
// figures and the fact chips instantly and always works offline. When an LLM is
// configured (ANTHROPIC_API_KEY set), Claude produces a smarter, free-form
// answer grounded in the same data — and we keep the rule-based facts as chips.
// Any LLM failure/timeout/refusal silently falls back to the rule-based answer.
router.post("/ask", auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: "Please ask a question." });
    const [txns, goals, user] = await Promise.all([
      dal.getTransactions(req.user.id),
      dal.getGoals(req.user.id),
      dal.findUserById(req.user.id),
    ]);
    const analytics = txns.length
      ? computeAnalytics(txns, { monthlyBudget: parseFloat(user?.monthlyBudget) || 0 })
      : null;

    const base = answerQuestion(question, analytics, goals, txns);

    if (isLLMEnabled() && analytics) {
      try {
        const smart = await askLLM(question, {
          analytics, transactions: txns, goals, currency: user?.currency || "INR",
        });
        if (smart) return res.json({ answer: smart, facts: base.facts });
      } catch (_) { /* fall through to the instant rule-based answer */ }
    }
    res.json(base);
  } catch (err) {
    res.status(500).json({ error: "Assistant is unavailable right now. Please try again." });
  }
});

module.exports = router;
