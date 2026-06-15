import { useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { Card, SectionHeader, Btn, Input, Select, Alert, Icon, fmt } from "../components/shared/UI";
import * as api from "../services/api";

export default function SettingsPage() {
  const { user, setUser, logout, analytics, transactions, goals, theme, setTheme } = useApp();
  const isGuest = user?.email === "guest@spendsmart.com";

  const [profile, setProfile] = useState({ name: user?.name || "", monthlyBudget: user?.monthlyBudget || "", currency: user?.currency || "INR" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passErrors, setPassErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const TABS = [
    { id: "profile",    label: "Profile" },
    { id: "appearance", label: "Appearance" },
    { id: "security",   label: "Security" },
    { id: "data",       label: "Data" },
  ];

  async function handleProfileSave() {
    if (!profile.name.trim()) { toast.error("Name cannot be empty."); return; }
    if (profile.name.trim().length < 2) { toast.error("Name must be at least 2 characters."); return; }
    if (profile.monthlyBudget && parseFloat(profile.monthlyBudget) < 0) { toast.error("Budget cannot be negative."); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.updateProfile(profile);
      setUser({ ...user, ...data.user });
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update profile.");
    } finally { setSavingProfile(false); }
  }

  function validatePass() {
    const e = {};
    if (!passwords.currentPassword) e.currentPassword = "Current password is required.";
    if (passwords.newPassword.length < 6) e.newPassword = "Must be at least 6 characters.";
    if (passwords.newPassword !== passwords.confirmPassword) e.confirmPassword = "Passwords do not match.";
    setPassErrors(e);
    return !Object.keys(e).length;
  }

  async function handlePasswordChange() {
    if (!validatePass()) return;
    setSavingPass(true);
    try {
      await api.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success("Password updated.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPassErrors({});
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change password.");
    } finally { setSavingPass(false); }
  }

  const spent = analytics?.budget?.spentThisMonth ?? analytics?.total ?? 0;
  const budget = parseFloat(profile.monthlyBudget) || 0;
  const budgetPct = budget > 0 ? Math.min(Math.round(spent / budget * 100), 100) : 0;
  const budgetColor = budgetPct >= 90 ? "var(--danger)" : budgetPct >= 70 ? "var(--warning)" : "var(--success)";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-1 bg-surface border border-stroke rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border-0 ${activeTab === t.id ? "bg-primary text-white [.dark_&]:text-[#0b0d13]" : "bg-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === "profile" && (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-stroke">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-primary flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-base font-bold text-ink tracking-tight">{user?.name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
              {isGuest && <span className="text-[11px] font-semibold text-warning">Guest account</span>}
            </div>
          </div>

          {isGuest ? (
            <Alert type="warning">Profile editing is not available for guest accounts. Sign up to save your data permanently.</Alert>
          ) : (
            <>
              <Input label="Full Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Monthly Budget" type="number" value={profile.monthlyBudget}
                  onChange={e => setProfile(p => ({ ...p, monthlyBudget: e.target.value }))} placeholder="e.g. 50000"
                  hint="Tracks budget usage with month-to-month carry forward" />
                <Select label="Currency" value={profile.currency} onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}
                  options={[{ value: "INR", label: "INR — Indian Rupee" }, { value: "USD", label: "USD — US Dollar" }, { value: "EUR", label: "EUR — Euro" }, { value: "GBP", label: "GBP — British Pound" }]} />
              </div>

              {budget > 0 && (
                <div className="mb-4 p-4 rounded-xl bg-surface2 border border-stroke">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-semibold text-ink2">Monthly Budget Usage</p>
                    <p className="text-xs font-bold tnum" style={{ color: budgetColor }}>{budgetPct}% used</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-surface3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, background: budgetColor }} />
                  </div>
                  <p className="text-xs text-muted mt-1.5 tnum">
                    Spent {fmt(spent)} of {fmt(budget)}
                    {budgetPct >= 90 && <span className="text-danger font-semibold"> · budget nearly exceeded</span>}
                  </p>
                </div>
              )}

              <Btn onClick={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Profile"}
              </Btn>
            </>
          )}
        </Card>
      )}

      {/* Appearance */}
      {activeTab === "appearance" && (
        <Card className="p-6">
          <SectionHeader title="Theme" sub="Choose how SpendSmart looks" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "light", label: "Light", icon: "sun",  desc: "Bright, high-contrast" },
              { id: "dark",  label: "Dark",  icon: "moon", desc: "Easy on the eyes" },
            ].map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={`p-4 rounded-2xl border text-left transition-colors ${theme === t.id ? "border-primary" : "border-stroke hover:border-strokeStrong"}`}
                style={{ background: theme === t.id ? "var(--primary-soft)" : "var(--surface-2)" }}>
                <span className={theme === t.id ? "text-primary" : "text-muted"}>
                  <Icon name={t.icon} size={18} />
                </span>
                <p className="text-sm font-semibold text-ink mt-2">{t.label}</p>
                <p className="text-xs text-muted mt-0.5">{t.desc}</p>
                {theme === t.id && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary mt-2">
                    <Icon name="check" size={11} /> Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <Card className="p-6">
          <SectionHeader title="Change Password" sub="Keep your account secure" />
          {isGuest ? (
            <Alert type="info">Sign up for a full account to manage your password and data securely.</Alert>
          ) : (
            <>
              <Input label="Current Password" type="password" value={passwords.currentPassword}
                onChange={e => { setPasswords(p => ({ ...p, currentPassword: e.target.value })); setPassErrors(er => ({ ...er, currentPassword: "" })); }}
                error={passErrors.currentPassword} required />
              <Input label="New Password" type="password" value={passwords.newPassword}
                onChange={e => { setPasswords(p => ({ ...p, newPassword: e.target.value })); setPassErrors(er => ({ ...er, newPassword: "" })); }}
                placeholder="Min 6 characters" error={passErrors.newPassword} required hint="Use an uppercase letter and a number for a stronger password." />
              <Input label="Confirm New Password" type="password" value={passwords.confirmPassword}
                onChange={e => { setPasswords(p => ({ ...p, confirmPassword: e.target.value })); setPassErrors(er => ({ ...er, confirmPassword: "" })); }}
                error={passErrors.confirmPassword} required />
              <Btn onClick={handlePasswordChange} disabled={savingPass} icon="lock">
                {savingPass ? "Updating…" : "Update Password"}
              </Btn>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-stroke">
            <SectionHeader title="Session" sub="Manage your current session" />
            <Btn variant="danger" icon="logout" onClick={() => { logout(); toast.success("Signed out."); }}>
              Sign Out of SpendSmart
            </Btn>
          </div>
        </Card>
      )}

      {/* Data */}
      {activeTab === "data" && (
        <Card className="p-6">
          <SectionHeader title="Your Data" sub="Overview of stored data" />
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { l: "Transactions",  v: transactions.length,                 icon: "creditCard" },
              { l: "Goals",         v: goals.length,                        icon: "target" },
              { l: "Total Tracked", v: fmt(analytics?.total || 0),          icon: "wallet" },
              { l: "Health Score",  v: `${analytics?.healthScore || 0}/100`, icon: "shield" },
            ].map(s => (
              <div key={s.l} className="p-4 rounded-xl bg-surface2 border border-stroke flex items-center gap-3">
                <span className="text-primary"><Icon name={s.icon} size={18} /></span>
                <div>
                  <p className="text-base font-bold text-ink tnum tracking-tight">{s.v}</p>
                  <p className="text-xs text-muted">{s.l}</p>
                </div>
              </div>
            ))}
          </div>
          <Alert type="info">All data is stored securely in MongoDB Atlas, retained without time limits, and analysed over any period you choose from the dashboard.</Alert>

          <div className="mt-4 pt-4 border-t border-stroke">
            <SectionHeader title="About" />
            <div className="space-y-1.5 text-sm">
              {[
                { l: "Version",   v: "5.0.0" },
                { l: "Frontend",  v: "React 18 · Vite · Tailwind CSS · Recharts · Framer Motion" },
                { l: "Backend",   v: "Node.js · Express · MongoDB Atlas" },
                { l: "Auth",      v: "JWT + refresh tokens · bcrypt (12 rounds) · email verification" },
                { l: "AI Engine", v: "Multi-signal anomaly detection · NLP categorisation · forecasting · assistant" },
                { l: "Files",     v: "CSV, XLSX, XLS, PDF statement import" },
              ].map(s => (
                <div key={s.l} className="flex gap-3 py-2 border-b border-stroke last:border-0">
                  <span className="text-xs font-semibold text-muted w-24 flex-shrink-0 pt-0.5">{s.l}</span>
                  <span className="text-xs text-ink2">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
