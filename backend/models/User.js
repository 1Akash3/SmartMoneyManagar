const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verifyToken: String,
  verifyOtp: String,
  verifyOtpExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
  refreshToken: String,
  avatar: { type: String, default: "" },
  currency: { type: String, default: "INR" },
  monthlyBudget: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
