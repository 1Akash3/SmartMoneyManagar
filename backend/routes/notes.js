const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const dal     = require("../utils/dal");

router.get("/", auth, async (req, res) => {
  try {
    const notes = await dal.getNotes(req.user.id);
    // Auto-mark overdue
    const today = new Date().toISOString().slice(0, 10);
    const updated = notes.map(n => {
      if (n.dueDate && n.dueDate < today && n.status === "pending") {
        return { ...( n.toObject ? n.toObject() : n ), status: "overdue" };
      }
      return n.toObject ? n.toObject() : n;
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notes." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { title, description, amount, dueDate, priority } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required." });
    const note = await dal.createNote({
      userId: req.user.id, title: title.trim(),
      description: description || "", amount: parseFloat(amount) || 0,
      dueDate: dueDate || "", priority: priority || "medium",
    });
    res.status(201).json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: "Failed to create note." });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const updated = await dal.updateNote(req.params.id, req.user.id, req.body);
    if (!updated) return res.status(404).json({ error: "Note not found." });
    res.json({ success: true, note: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update note." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const removed = await dal.deleteNote(req.params.id, req.user.id);
    if (!removed) return res.status(404).json({ error: "Note not found." });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete note." });
  }
});

module.exports = router;
