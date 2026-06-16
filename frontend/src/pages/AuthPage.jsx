import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import * as api from "../services/api";
import { useApp } from "../context/AppContext";
import { Input, Alert, Icon } from "../components/shared/UI";
import { trackEvent } from "../utils/analytics";

function PasswordInput({ label, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-ink2 mb-1.5">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-surface2 border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-faint pr-11 transition-colors ${error ? "border-danger" : "border-stroke"}`}
          style={{ outline: "none" }} />
        <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors bg-transparent border-0">
          <Icon name={show ? "eyeOff" : "eye"} size={15} />
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-1 flex items-center gap-1"><Icon name="alertCircle" size={12} /> {error}</p>}
    </div>
  );
}

function StrengthBar({ password }) {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#059669"];
  return (
    <div className="mb-3 -mt-1">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= strength ? colors[strength] : "var(--surface-3)" }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[strength] }}>{labels[strength]}</p>
    </div>
  );
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

function TurnstileWidget({ onToken, resetRef }) {
  const ref = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    function render() {
      if (window.turnstile && ref.current && widgetId.current === null) {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          callback: onToken,
          "expired-callback": () => onToken(""),
        });
      }
    }
    if (window.turnstile) { render(); return; }
    const existing = document.querySelector("script[src*='turnstile']");
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      existing.addEventListener("load", render);
    }
    return () => { if (window.turnstile && widgetId.current !== null) { try { window.turnstile.remove(widgetId.current); } catch {} widgetId.current = null; } };
  }, []);

  useEffect(() => {
    if (resetRef) resetRef.current = () => {
      if (window.turnstile && widgetId.current !== null) {
        window.turnstile.reset(widgetId.current);
        onToken("");
      }
    };
  }, [resetRef, onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="mb-4 flex justify-center" />;
}

const FEATURES = [
  { icon: "pieChart",   text: "AI-powered spending analytics" },
  { icon: "target",     text: "Goal tracking with smart projections" },
  { icon: "bell",       text: "Bill reminders and budget alerts" },
  { icon: "fileText",   text: "PDF, CSV and Excel statement import" },
];

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot | verify
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", rememberMe: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const turnstileResetRef = useRef(null);
  const { setUser } = useApp();

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };

  function validate() {
    const e = {};
    if (mode === "signup" && !form.name.trim()) e.name = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (mode !== "forgot") {
      if (form.password.length < 6) e.password = "Password must be at least 6 characters.";
      if (mode === "signup" && form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "forgot") {
        await api.forgotPassword({ email: form.email });
        setForgotSent(true);
        toast.success("Reset link sent. Check your inbox.");
        setLoading(false);
        return;
      }
      if (mode === "signup") {
        const { data } = await api.signup({ ...form, turnstileToken });
        if (data.requiresVerification) {
          trackEvent("sign_up", { method: "password" });
          setVerifyEmail(data.email);
          setMode("verify");
          setResendCooldown(60);
          if (data.otp) {
            setOtp(data.otp.split(""));
            toast("Email unavailable — code pre-filled for testing.");
          } else {
            toast.success(`Verification code sent to ${data.email}`);
          }
          setLoading(false);
          return;
        }
      } else {
        const { data } = await api.login({ ...form, turnstileToken });
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        setUser(data.user);
        trackEvent("login", { method: "password" });
        toast.success(`Welcome back, ${data.user.name}.`);
        onAuth(data.user);
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || "Something went wrong. Please try again.";
      if (code === "EMAIL_NOT_VERIFIED") {
        setVerifyEmail(err.response.data.email || form.email);
        setMode("verify");
        setResendCooldown(60);
        toast("Account not verified. Enter your verification code.");
      } else {
        toast.error(msg);
        if (msg.toLowerCase().includes("email")) setErrors(e2 => ({ ...e2, email: msg }));
        if (msg.toLowerCase().includes("password")) setErrors(e2 => ({ ...e2, password: msg }));
      }
    } finally {
      setLoading(false);
      turnstileResetRef.current?.();
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleOtpChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  function handleOtpPaste(e) {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (text.length >= 4) {
      e.preventDefault();
      setOtp([...text.padEnd(6, "").slice(0, 6)].map(c => c.trim()));
      otpRefs.current[Math.min(text.length, 5)]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return toast.error("Enter the full 6-digit code.");
    setLoading(true);
    try {
      const { data } = await api.verifyEmail({ email: verifyEmail, otp: code });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setUser(data.user);
      toast.success(`Welcome to SpendSmart, ${data.user.name}.`);
      onAuth(data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Verification failed.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      const { data } = await api.resendOtp({ email: verifyEmail });
      setResendCooldown(60);
      if (data.otp) {
        setOtp(data.otp.split(""));
        toast("Email unavailable — code pre-filled for testing.");
      } else {
        toast.success("New code sent to your email.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to resend.");
    }
  }

  async function guestLogin() {
    setLoading(true);
    try {
      const { data } = await api.login({ email: "guest@spendsmart.com", password: "guest123" });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setUser(data.user);
      trackEvent("login", { method: "guest" });
      toast.success("Logged in as guest.");
      onAuth(data.user);
    } catch { toast.error("Guest login unavailable. Please sign up."); }
    finally { setLoading(false); }
  }

  const submitBtnCls = "w-full py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition-opacity mb-3 border-0 disabled:opacity-60 [.dark_&]:text-[#0b0d13]";

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)" }}>
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">SpendSmart</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
            Take control of<br />your finances
          </h1>
          <p className="text-white/60 text-base mb-10 max-w-sm leading-relaxed">
            AI-powered insights that help you spend smarter, save faster, and reach your financial goals.
          </p>
          <div className="space-y-4">
            {FEATURES.map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center text-white/80">
                  <Icon name={f.icon} size={15} />
                </div>
                <span className="text-white/75 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-white/35 text-xs">© 2026 SpendSmart · Financial Intelligence Platform</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
              </svg>
            </div>
            <span className="font-bold text-ink text-lg tracking-tight">SpendSmart</span>
          </div>

          {mode === "verify" ? (
            <div>
              <div className="mb-6">
                <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center mb-4 text-white">
                  <Icon name="mail" size={19} />
                </div>
                <h2 className="text-2xl font-bold text-ink tracking-tight">Check your email</h2>
                <p className="text-sm text-muted mt-1">We sent a 6-digit code to <strong className="text-ink2">{verifyEmail}</strong></p>
              </div>
              <form onSubmit={handleVerify}>
                <div className="flex gap-2 justify-between mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-stroke bg-surface2 text-ink tnum transition-colors"
                      style={{ outline: "none" }} />
                  ))}
                </div>
                <button type="submit" disabled={loading} className={submitBtnCls}>
                  {loading ? "Verifying…" : "Verify and Continue"}
                </button>
              </form>
              <p className="text-xs text-center text-muted mt-2">
                Didn't receive it?{" "}
                {resendCooldown > 0
                  ? <span className="text-faint tnum">Resend in {resendCooldown}s</span>
                  : <button onClick={handleResend} className="text-primary font-semibold hover:underline bg-transparent border-0">Resend code</button>}
              </p>
              <button onClick={() => { setMode("signup"); setOtp(["", "", "", "", "", ""]); }}
                className="mt-4 w-full text-xs text-center text-muted hover:text-primary bg-transparent border-0 transition-colors">
                Back to sign up
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-ink tracking-tight">
                  {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
                </h2>
                <p className="text-sm text-muted mt-1">
                  {mode === "login" ? "Welcome back. Enter your details." :
                    mode === "signup" ? "Start your financial journey today." :
                      "Enter your email to receive a reset link."}
                </p>
              </div>

              {forgotSent ? (
                <Alert type="success">Reset link sent to <strong>{form.email}</strong>. Check your inbox and spam folder.</Alert>
              ) : (
                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {mode === "signup" && (
                      <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <Input label="Full Name" value={form.name} onChange={set("name")} placeholder="Your full name" error={errors.name} required />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" error={errors.email} required />

                  {mode !== "forgot" && (
                    <>
                      <PasswordInput label="Password" value={form.password} onChange={set("password")}
                        placeholder={mode === "signup" ? "Min 6 characters" : "Your password"} error={errors.password} />
                      {mode === "signup" && <StrengthBar password={form.password} />}
                      {mode === "signup" && (
                        <PasswordInput label="Confirm Password" value={form.confirmPassword}
                          onChange={set("confirmPassword")} placeholder="Repeat password" error={errors.confirmPassword} />
                      )}
                    </>
                  )}

                  {mode === "login" && (
                    <div className="flex items-center justify-between mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.rememberMe}
                          onChange={e => setForm(f => ({ ...f, rememberMe: e.target.checked }))}
                          className="w-3.5 h-3.5 accent-[var(--primary)] rounded" />
                        <span className="text-xs text-ink2">Remember me</span>
                      </label>
                      <button type="button" onClick={() => setMode("forgot")}
                        className="text-xs text-primary font-medium hover:underline bg-transparent border-0">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {mode !== "forgot" && <TurnstileWidget onToken={setTurnstileToken} resetRef={turnstileResetRef} />}

                  <button type="submit" disabled={loading} className={submitBtnCls}>
                    {loading ? "Please wait…" : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  </button>
                </form>
              )}

              {mode !== "forgot" && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 border-t border-stroke" />
                    <span className="text-xs text-faint">or</span>
                    <div className="flex-1 border-t border-stroke" />
                  </div>
                  <button onClick={guestLogin} disabled={loading}
                    className="w-full py-2.5 rounded-xl text-sm text-ink2 border border-stroke bg-surface hover:bg-surface2 transition-colors flex items-center justify-center gap-2">
                    <Icon name="user" size={14} /> Continue as Guest
                  </button>
                </>
              )}

              <div className="mt-5 text-center">
                {mode === "login" && <p className="text-xs text-muted">Don't have an account? <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline bg-transparent border-0">Sign up free</button></p>}
                {mode === "signup" && <p className="text-xs text-muted">Already have an account? <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline bg-transparent border-0">Sign in</button></p>}
                {mode === "forgot" && <button onClick={() => { setMode("login"); setForgotSent(false); }} className="text-xs text-primary font-semibold hover:underline bg-transparent border-0">Back to sign in</button>}
              </div>
            </>
          )}

          <div className="mt-8 pt-4 border-t border-stroke flex items-center justify-center gap-4 text-[11px] text-faint">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
            <a href="/contact" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
