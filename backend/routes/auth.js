const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const dal      = require("../utils/dal");
const auth     = require("../middleware/auth");
const verifyTurnstile = require("../middleware/turnstile");

const signAccess  = p => jwt.sign(p, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_ACCESS_EXPIRY         || "15m" });
const signRefresh = p => jwt.sign(p, process.env.JWT_REFRESH_SECRET,  { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d"  });
const userPayload = u => ({ id: u._id || u.id, name: u.name, email: u.email });

// Guest demo account. Uses a fixed, valid ObjectId so that data queries
// (userId is an ObjectId in every model) cast cleanly instead of throwing.
const GUEST_ID    = "000000000000000000000000";
const GUEST_EMAIL = "guest@spendsmart.com";

// ── Signup ────────────────────────────────────────────────────
router.post("/signup", verifyTurnstile, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)              return res.status(400).json({ error: "All fields are required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email address." });
    if (password.length < 6)                       return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (await dal.findUserByEmail(email))          return res.status(400).json({ error: "Email already registered. Please log in." });

    const hashed  = await bcrypt.hash(password, 12);
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry  = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const user    = await dal.createUser({
      name: name.trim(), email: email.toLowerCase(), password: hashed,
      isVerified: false, verifyOtp: otp, verifyOtpExpiry: expiry,
    });

    const { sendMail } = require("../utils/mailer");
    const mailResult = await sendMail({
      to: email,
      subject: "SpendSmart — Your Verification Code",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e8ecf4">
        <h2 style="color:#6c63ff;margin-bottom:8px">Verify your email</h2>
        <p style="color:#4a5168;font-size:14px">Use the code below to complete your SpendSmart registration. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align:center;margin:24px 0">
          <span style="display:inline-block;padding:16px 32px;background:#f4f3ff;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#6c63ff">${otp}</span>
        </div>
        <p style="color:#8b92a5;font-size:12px">If you didn't create an account, you can safely ignore this email.</p></div>`,
    });

    // In dev, always log OTP so developer can test without email
    if (process.env.NODE_ENV === "development") {
      console.log(`[Signup] OTP for ${email}: ${otp}`);
    }

    res.status(201).json({
      requiresVerification: true,
      email: email.toLowerCase(),
      // Surface OTP in dev if email failed, so testing isn't blocked
      otp: (process.env.NODE_ENV === "development" && !mailResult.sent) ? otp : undefined,
      emailSent: mailResult.sent,
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

// ── Verify Email OTP ──────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and code are required." });

    const { isUsingMongo, getStore } = require("../config/db");
    let user;
    if (isUsingMongo()) {
      const User = require("../models/User");
      user = await User.findOne({ email: email.toLowerCase(), verifyOtp: otp, verifyOtpExpiry: { $gt: new Date() } });
    } else {
      user = getStore().users.find(u => u.email === email.toLowerCase() && u.verifyOtp === otp && new Date(u.verifyOtpExpiry) > new Date());
    }
    if (!user) return res.status(400).json({ error: "Invalid or expired verification code." });

    await dal.updateUser(user._id || user.id, { isVerified: true, verifyOtp: null, verifyOtpExpiry: null });
    const payload      = userPayload(user);
    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh(payload);
    await dal.updateUser(user._id || user.id, { refreshToken });
    res.json({ accessToken, refreshToken, user: payload });
  } catch (err) {
    console.error("Verify email error:", err.message);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ── Resend OTP ────────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
    const user = await dal.findUserByEmail(email);
    if (!user || user.isVerified) return res.status(400).json({ error: "Account not found or already verified." });

    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await dal.updateUser(user._id || user.id, { verifyOtp: otp, verifyOtpExpiry: expiry });

    const { sendMail } = require("../utils/mailer");
    const resendResult = await sendMail({
      to: email,
      subject: "SpendSmart — New Verification Code",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e8ecf4">
        <h2 style="color:#6c63ff;margin-bottom:8px">Your new verification code</h2>
        <div style="text-align:center;margin:24px 0">
          <span style="display:inline-block;padding:16px 32px;background:#f4f3ff;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#6c63ff">${otp}</span>
        </div>
        <p style="color:#8b92a5;font-size:12px">This code expires in 10 minutes.</p></div>`,
    });
    if (process.env.NODE_ENV === "development") console.log(`[Resend OTP] ${email}: ${otp}`);
    res.json({
      success: true,
      otp: (process.env.NODE_ENV === "development" && !resendResult.sent) ? otp : undefined,
      emailSent: resendResult.sent,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to resend code." });
  }
});

// ── Login ─────────────────────────────────────────────────────
router.post("/login", verifyTurnstile, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    // Guest login
    if (email === GUEST_EMAIL && password === "guest123") {
      const g = { id: GUEST_ID, name: "Guest User", email };
      return res.json({ accessToken: signAccess(g), refreshToken: signRefresh(g), user: g });
    }

    const user = await dal.findUserByEmail(email);
    if (!user)                              return res.status(401).json({ error: "No account found with this email." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)                             return res.status(401).json({ error: "Incorrect password." });
    if (user.isVerified === false)          return res.status(403).json({ error: "Email not verified. Please check your inbox for the verification code.", code: "EMAIL_NOT_VERIFIED", email: user.email });

    const payload      = userPayload(user);
    const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: rememberMe ? "30d" : process.env.JWT_ACCESS_EXPIRY || "15m" });
    const refreshToken = signRefresh(payload);
    await dal.updateUser(user._id || user.id, { refreshToken });
    res.json({ accessToken, refreshToken, user: payload });
  } catch (err) {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── Refresh Token ─────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token provided." });
    const decoded  = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const payload  = { id: decoded.id, name: decoded.name, email: decoded.email };
    res.json({ accessToken: signAccess(payload) });
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again.", code: "TOKEN_EXPIRED" });
  }
});

// ── Forgot Password ───────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
    const user = await dal.findUserByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: "If that email exists, a reset link has been sent." });

    const token   = crypto.randomBytes(32).toString("hex");
    const expiry  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await dal.updateUser(user._id || user.id, { resetToken: token, resetTokenExpiry: expiry });

    // Send reset email via Brevo SMTP
    const { sendMail } = require("../utils/mailer");
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}?reset=${token}`;
    await sendMail({
      to: email,
      subject: "SpendSmart — Reset Your Password",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e8ecf4">
        <h2 style="color:#6c63ff;margin-bottom:8px">Reset your password</h2>
        <p style="color:#4a5168;font-size:14px">Click the button below to reset your SpendSmart password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6c63ff;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#8b92a5;font-size:12px">If you didn't request this, you can safely ignore this email.</p></div>`,
    });

    res.json({ success: true, message: "If that email exists, a reset link has been sent.", token: process.env.NODE_ENV === "development" ? token : undefined });
  } catch (err) {
    res.status(500).json({ error: "Failed to process request." });
  }
});

// ── Reset Password ────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)  return res.status(400).json({ error: "Token and new password are required." });
    if (newPassword.length < 6)  return res.status(400).json({ error: "Password must be at least 6 characters." });

    const { isUsingMongo, getStore } = require("../config/db");
    let user;
    if (isUsingMongo()) {
      const User = require("../models/User");
      user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    } else {
      user = getStore().users.find(u => u.resetToken === token && new Date(u.resetTokenExpiry) > new Date());
    }
    if (!user) return res.status(400).json({ error: "Reset link is invalid or has expired." });

    const hashed = await bcrypt.hash(newPassword, 12);
    await dal.updateUser(user._id || user.id, { password: hashed, resetToken: null, resetTokenExpiry: null });
    res.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// ── Get current user ──────────────────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    if (req.user.id === GUEST_ID) {
      return res.json({ id: GUEST_ID, name: "Guest User", email: GUEST_EMAIL, monthlyBudget: 0, currency: "INR" });
    }
    const user = await dal.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    const obj = user.toObject ? user.toObject() : { ...user };
    const { password, refreshToken, resetToken, resetTokenExpiry, ...safe } = obj;
    res.json(safe);
  } catch { res.status(500).json({ error: "Failed to fetch user." }); }
});

// ── Update Profile ────────────────────────────────────────────
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, monthlyBudget, currency } = req.body;
    if (name && name.trim().length < 2) return res.status(400).json({ error: "Name must be at least 2 characters." });
    const updated = await dal.updateUser(req.user.id, { name: name?.trim(), monthlyBudget: parseFloat(monthlyBudget) || 0, currency: currency || "INR" });
    res.json({ success: true, user: updated });
  } catch { res.status(500).json({ error: "Failed to update profile." }); }
});

// ── Change Password ───────────────────────────────────────────
router.put("/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both fields are required." });
    if (newPassword.length < 6)           return res.status(400).json({ error: "New password must be at least 6 characters." });
    const user  = await dal.findUserById(req.user.id);
    if (!user)                            return res.status(404).json({ error: "User not found." });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)                           return res.status(401).json({ error: "Current password is incorrect." });
    if (currentPassword === newPassword)  return res.status(400).json({ error: "New password must be different from current." });
    await dal.updateUser(req.user.id, { password: await bcrypt.hash(newPassword, 12) });
    res.json({ success: true, message: "Password updated successfully." });
  } catch { res.status(500).json({ error: "Failed to change password." }); }
});

module.exports = router;
