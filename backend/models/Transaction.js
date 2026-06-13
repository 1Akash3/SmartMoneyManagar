const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  merchant: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  type: { type: String, enum: ["expense", "income", "transfer", "saving", "investment"], default: "expense" },
  paymentMethod: { type: String, default: "" },
  city: { type: String, default: "" },
  notes: { type: String, default: "" },
  isOutlier: { type: Boolean, default: false },
  expectedConfirmed: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false },
  dayOfWeek: { type: Number },
  source: { type: String, enum: ["upload", "manual"], default: "manual" },
  importId: { type: String, default: "" },
  importFile: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
