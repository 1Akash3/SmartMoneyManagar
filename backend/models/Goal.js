const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ["savings", "purchase", "emergency"], default: "savings" },
  targetAmount: { type: Number, required: true },
  savedAmount: { type: Number, default: 0 },
  deadline: { type: String },
  icon: { type: String, default: "target" },
  color: { type: String, default: "#4f46e5" },
  status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Goal", goalSchema);
