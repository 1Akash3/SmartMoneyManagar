const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const dal     = require("../utils/dal");

router.get("/", auth, async (req, res) => {
  try {
    res.json(await dal.getGoals(req.user.id));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch goals." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { title, type, targetAmount, deadline, icon, color } = req.body;
    if (!title || !targetAmount) return res.status(400).json({ error: "Title and target amount are required." });
    if (parseFloat(targetAmount) <= 0) return res.status(400).json({ error: "Target amount must be positive." });
    if (parseFloat(targetAmount) > 10000000) return res.status(400).json({ error: "Target amount seems unrealistic. Please enter a realistic goal." });

    await dal.deleteTransactionsByImport(req.user.id, "sample"); // real activity replaces demo sample data
    const goal = await dal.createGoal({
      userId: req.user.id, title: title.trim(), type: type || "savings",
      targetAmount: parseFloat(targetAmount), savedAmount: 0,
      deadline: deadline || "", icon: icon || "target", color: color || "#4f46e5",
    });
    res.status(201).json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ error: "Failed to create goal." });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await dal.updateGoal(req.params.id, req.user.id, req.body);
    if (!updated) return res.status(404).json({ error: "Goal not found." });
    res.json({ success: true, goal: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update goal." });
  }
});

// Add money to goal
router.post("/:id/deposit", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: "Amount must be positive." });
    const goals = await dal.getGoals(req.user.id);
    const goal  = goals.find(g => (g._id || g.id).toString() === req.params.id);
    if (!goal) return res.status(404).json({ error: "Goal not found." });

    const newSaved  = Math.min(goal.savedAmount + parseFloat(amount), goal.targetAmount);
    const newStatus = newSaved >= goal.targetAmount ? "completed" : "active";
    const updated   = await dal.updateGoal(req.params.id, req.user.id, { savedAmount: newSaved, status: newStatus });
    res.json({ success: true, goal: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to deposit to goal." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const removed = await dal.deleteGoal(req.params.id, req.user.id);
    if (!removed) return res.status(404).json({ error: "Goal not found." });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete goal." });
  }
});

module.exports = router;
