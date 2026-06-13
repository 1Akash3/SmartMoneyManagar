const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const dal     = require("../utils/dal");
const { computeAnalytics, answerQuestion } = require("../utils/analytics");

// AI Financial Assistant — answers natural-language questions about the
// user's finances from their own analytics. Rule-based engine; degrades
// to a summary answer when the question isn't recognised.
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
    res.json(answerQuestion(question, analytics, goals, txns));
  } catch (err) {
    res.status(500).json({ error: "Assistant is unavailable right now. Please try again." });
  }
});

module.exports = router;
