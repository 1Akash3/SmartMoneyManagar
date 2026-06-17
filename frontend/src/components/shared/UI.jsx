// ── SpendSmart UI kit — token-driven, dark-mode aware, zero emoji ──

/* Inline stroke icon set (lucide-style 24x24 paths) */
const ICON_PATHS = {
  dashboard:   "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  transactions:"M8 3L4 7l4 4 M4 7h16 M16 21l4-4-4-4 M20 17H4",
  target:      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  reports:     "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3",
  settings:    "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
  bell:        "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  logout:      "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu:        "M4 6h16 M4 12h16 M4 18h16",
  x:           "M18 6L6 18 M6 6l12 12",
  plus:        "M12 5v14 M5 12h14",
  search:      "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35",
  upload:      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  download:    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  mail:        "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6",
  edit:        "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  trash:       "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6",
  check:       "M20 6L9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight:"M9 18l6-6-6-6",
  chevronDown: "M6 9l6 6 6-6",
  alertTriangle:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  alertCircle: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4 M12 16h.01",
  info:        "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 16v-4 M12 8h.01",
  trendingUp:  "M22 7l-8.5 8.5-5-5L2 17 M16 7h6v6",
  trendingDown:"M22 17l-8.5-8.5-5 5L2 7 M16 17h6v-6",
  wallet:      "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12a2 2 0 0 0 0 4h4v-4z",
  bank:        "M3 22h18 M6 18v-7 M10 18v-7 M14 18v-7 M18 18v-7 M12 2L2 7h20z",
  calendar:    "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  repeat:      "M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3",
  sparkles:    "M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z",
  sun:         "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41",
  moon:        "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z",
  send:        "M22 2L11 13 M22 2l-7 20-4-9-9-4z",
  fileText:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  creditCard:  "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M2 10h20",
  award:       "M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M15.5 12.9L17 22l-5-3-5 3 1.5-9.1",
  pause:       "M10 4H6v16h4z M18 4h-4v16h4z",
  play:        "M5 3l14 9-14 9z",
  filter:      "M22 3H2l8 9.46V19l4 2v-8.54z",
  zap:         "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  eye:         "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff:      "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M14.12 14.12a3 3 0 1 1-4.24-4.24 M1 1l22 22",
  user:        "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  lock:        "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M7 11V7a5 5 0 0 1 10 0v4",
  refresh:     "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  clock:       "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
  inbox:       "M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  shield:      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  message:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  pieChart:    "M21.21 15.89A10 10 0 1 1 8 2.83 M22 12A10 10 0 0 0 12 2v10z",
  banknote:    "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M6 12h.01 M18 12h.01",
  // Goal icons
  laptop:      "M4 5h16v11H4z M2 19h20",
  plane:       "M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
  home:        "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  car:         "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2 M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M9 17h6",
  gem:         "M6 3h12l4 6-10 13L2 9z M11 3L8 9l4 13 4-13-3-6 M2 9h20",
  book:        "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  graduation:  "M22 10L12 5 2 10l10 5z M6 12v5c3 3 9 3 12 0v-5",
  umbrella:    "M22 12A10 10 0 0 0 2 12z M12 12v8a2 2 0 0 0 4 0 M12 2v1",
  heartPulse:  "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z M3.2 12h6.3l.8-1 2 4.5 2-7 1.5 3.5H21",
  smartphone:  "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01",
  globe:       "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
};

export function Icon({ name, size = 16, className = "", strokeWidth = 1.8, style }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={`flex-shrink-0 ${className}`} style={style} aria-hidden="true">
      {d.split(" M").map((seg, i) => <path key={i} d={i === 0 ? seg : "M" + seg} />)}
    </svg>
  );
}

export const GOAL_ICONS = ["target", "laptop", "plane", "home", "car", "gem", "book", "graduation", "umbrella", "heartPulse", "smartphone", "globe"];

/* ── Layout primitives ─────────────────────────────────────── */

export function Card({ children, className = "", hover = false, ...rest }) {
  return (
    <div className={`bg-surface border border-stroke rounded-2xl shadow-card ${hover ? "transition-all hover:border-strokeStrong" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function KPICard({ label, value, sub, color = "var(--primary)", icon, trend, onClick, hint }) {
  return (
    <div onClick={onClick}
      className={`bg-surface border border-stroke rounded-2xl shadow-card p-4 transition-all group ${onClick ? "cursor-pointer hover:border-strokeStrong hover:-translate-y-px" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-muted uppercase tracking-wide">{label}</span>
        {icon && (
          <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--surface-2)", color }}>
            <Icon name={icon} size={14} />
          </span>
        )}
      </div>
      <p className="text-xl font-bold tnum tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      {trend !== undefined && (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1.5 ${trend >= 0 ? "text-success" : "text-danger"}`}>
          <Icon name={trend >= 0 ? "trendingUp" : "trendingDown"} size={12} /> {Math.abs(trend)}%
        </span>
      )}
      {onClick && (
        <span className="flex items-center gap-0.5 text-[11px] font-medium text-faint group-hover:text-primary transition-colors mt-1.5">
          {hint || "View details"} <Icon name="chevronRight" size={11} />
        </span>
      )}
    </div>
  );
}

export function Badge({ children, color = "var(--primary)", soft = true }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1"
      style={soft ? { background: color === "var(--primary)" ? "var(--primary-soft)" : `color-mix(in srgb, ${color} 12%, transparent)`, color } : { background: color, color: "#fff" }}>
      {children}
    </span>
  );
}

export function Spinner({ size = "md", light = false }) {
  const s = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-9 h-9" : "w-6 h-6";
  return <div className={`${s} border-2 ${light ? "border-white/80" : "border-primary"} border-t-transparent rounded-full animate-spin`} />;
}

/* 3D flipping-coin loader — used for full-page / feature loading states. */
export function CoinLoader({ size = 52 }) {
  return (
    <div className="coin-stage" style={{ width: size, height: size }}>
      <div className="coin-loader" style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}>₹</div>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <CoinLoader size={54} />
      <p className="text-sm text-muted">Loading</p>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 bg-surface2 border border-stroke rounded-2xl flex items-center justify-center mb-4 text-muted">
        <Icon name={icon} size={22} />
      </div>
      <p className="text-sm font-semibold text-ink mb-1">{title}</p>
      <p className="text-sm text-muted max-w-xs leading-relaxed">{sub}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", disabled, className = "", type = "button", icon, ...rest }) {
  const sizes = { xs: "px-2.5 py-1.5 text-xs", sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-sm" };
  const variants = {
    primary:   "bg-primary text-white hover:opacity-90 [.dark_&]:text-[#0b0d13] font-semibold",
    secondary: "bg-surface2 text-ink2 border border-stroke hover:bg-surface3",
    ghost:     "bg-transparent text-muted hover:text-ink hover:bg-surface2",
    danger:    "text-danger border border-stroke hover:border-danger/40 bg-surface",
    success:   "text-success border border-stroke hover:border-success/40 bg-surface",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all leading-none ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}>
      {icon && <Icon name={icon} size={size === "xs" || size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

export function Input({ label, value, onChange, placeholder, type = "text", error, className = "", hint, required }) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-ink2 mb-1.5">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={`w-full bg-surface2 border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-faint transition-colors ${error ? "border-danger" : "border-stroke"}`}
        style={{ outline: "none" }} />
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1 flex items-center gap-1"><Icon name="alertCircle" size={12} /> {error}</p>}
    </div>
  );
}

export function Select({ label, value, onChange, options, className = "", required, error }) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && <label className="block text-xs font-medium text-ink2 mb-1.5">{label}{required && <span className="text-danger ml-0.5">*</span>}</label>}
      <select value={value} onChange={onChange}
        className={`w-full bg-surface2 border rounded-xl px-3.5 py-2.5 text-sm text-ink transition-colors cursor-pointer ${error ? "border-danger" : "border-stroke"}`}
        style={{ outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <div className={`mb-3 ${className}`}>
      {label && <label className="block text-xs font-medium text-ink2 mb-1.5">{label}</label>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        className="w-full bg-surface2 border border-stroke rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-faint resize-none transition-colors"
        style={{ outline: "none" }} />
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, size = "md" }) {
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-surface border border-stroke rounded-3xl shadow-pop w-full ${widths[size]} max-h-[90vh] overflow-y-auto fade-up`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stroke">
          <div>
            <h3 className="text-base font-semibold text-ink tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition-colors ml-4 border-0 bg-transparent">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Alert({ type = "info", children }) {
  const map = {
    info:    { color: "var(--info)",    bg: "var(--info-soft)",    icon: "info" },
    success: { color: "var(--success)", bg: "var(--success-soft)", icon: "checkCircle" },
    warning: { color: "var(--warning)", bg: "var(--warning-soft)", icon: "alertTriangle" },
    danger:  { color: "var(--danger)",  bg: "var(--danger-soft)",  icon: "alertCircle" },
  };
  const s = map[type];
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm mb-3" style={{ background: s.bg, color: s.color }}>
      <Icon name={s.icon} size={15} className="mt-0.5" />
      <span className="flex-1 leading-relaxed">{children}</span>
    </div>
  );
}

export function ProgressBar({ value, max, color = "var(--primary)", height = 6 }) {
  const pct = Math.min(Math.round((value / (max || 1)) * 100), 100);
  return (
    <div className="w-full rounded-full overflow-hidden bg-surface3" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ── Domain constants ──────────────────────────────────────── */

/* Currency-aware money formatter. The active currency is set from the
   logged-in user's profile (see setCurrency) so changing it in Settings
   instantly updates every amount across the app. */
const CURRENCIES = {
  INR: { symbol: "₹", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "en-IE" },
  GBP: { symbol: "£", locale: "en-GB" },
};
let _currency = "INR";
export function setCurrency(code) {
  if (code && CURRENCIES[code]) _currency = code;
}
export const fmt = (n) => {
  const c = CURRENCIES[_currency] || CURRENCIES.INR;
  return c.symbol + Math.round(n || 0).toLocaleString(c.locale);
};

export const CAT_COLORS = {
  Food: "#ef4444", Shopping: "#a855f7", Groceries: "#10b981", Travel: "#f59e0b",
  Entertainment: "#ec4899", Bills: "#64748b", Utilities: "#0ea5e9", Subscriptions: "#6366f1",
  Healthcare: "#06b6d4", Education: "#3b82f6", Salary: "#22c55e", "Freelance Income": "#16a34a",
  Rent: "#f97316", EMI: "#dc2626", Fuel: "#84cc16", Investments: "#0891b2",
  Insurance: "#7c3aed", Transfers: "#94a3b8", Savings: "#059669", Others: "#9ca3af",
};

export const CATEGORIES = [
  "Food", "Travel", "Shopping", "Groceries", "Bills", "Utilities", "Entertainment",
  "Healthcare", "Education", "Investments", "Insurance", "Rent", "EMI", "Fuel",
  "Salary", "Freelance Income", "Transfers", "Subscriptions", "Savings", "Others",
];

/* Known merchants → domain (for real logos) + brand color (initials fallback).
   Person-to-person UPI payments have no logo, so they get colored initials. */
const BRANDS = {
  zomato:     { domain: "zomato.com",      color: "#E23744" },
  swiggy:     { domain: "swiggy.com",      color: "#FC8019" },
  netflix:    { domain: "netflix.com",     color: "#E50914" },
  spotify:    { domain: "spotify.com",     color: "#1DB954" },
  amazon:     { domain: "amazon.in",       color: "#FF9900" },
  flipkart:   { domain: "flipkart.com",    color: "#2874F0" },
  myntra:     { domain: "myntra.com",      color: "#FF3F6C" },
  uber:       { domain: "uber.com",        color: "#1A1A1A" },
  ola:        { domain: "olacabs.com",     color: "#A4C639" },
  rapido:     { domain: "rapido.bike",     color: "#F9C200" },
  starbucks:  { domain: "starbucks.in",    color: "#00704A" },
  dmart:      { domain: "dmart.in",        color: "#0C9E4A" },
  airtel:     { domain: "airtel.in",       color: "#E40000" },
  jio:        { domain: "jio.com",         color: "#0A2885" },
  irctc:      { domain: "irctc.co.in",     color: "#213D77" },
  paytm:      { domain: "paytm.com",       color: "#00BAF2" },
  phonepe:    { domain: "phonepe.com",     color: "#5F259F" },
  bookmyshow: { domain: "bookmyshow.com",  color: "#C4242B" },
  dominos:    { domain: "dominos.co.in",   color: "#0B648F" },
  mcdonalds:  { domain: "mcdonalds.com",   color: "#FFC72C" },
  kfc:        { domain: "kfc.co.in",       color: "#A4343A" },
  blinkit:    { domain: "blinkit.com",     color: "#F8CB46" },
  zepto:      { domain: "zeptonow.com",    color: "#950EDB" },
  bigbasket:  { domain: "bigbasket.com",   color: "#84C225" },
  nykaa:      { domain: "nykaa.com",       color: "#FC2779" },
  zudio:      { domain: "zudio.com",       color: "#16BCB4" },
  croma:      { domain: "croma.com",       color: "#0DAA4B" },
  decathlon:  { domain: "decathlon.in",    color: "#0082C3" },
  ikea:       { domain: "ikea.com",        color: "#0058A3" },
  ajio:       { domain: "ajio.com",        color: "#2C4152" },
  meesho:     { domain: "meesho.com",      color: "#F43397" },
  hotstar:    { domain: "hotstar.com",     color: "#0F1014" },
  zerodha:    { domain: "zerodha.com",     color: "#387ED1" },
  groww:      { domain: "groww.in",        color: "#00D09C" },
  coursera:   { domain: "coursera.org",    color: "#0056D2" },
  udemy:      { domain: "udemy.com",       color: "#A435F0" },
  pvr:        { domain: "pvrcinemas.com",  color: "#FFC20E" },
};

import { useState as _useState } from "react";

export function MerchantAvatar({ merchant, size = 34 }) {
  const [imgFailed, setImgFailed] = _useState(false);
  const m = (merchant || "").toLowerCase();
  const brand = BRANDS[Object.keys(BRANDS).find(k => m.includes(k))];
  const initials = (merchant || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = [...(merchant || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

  if (brand && !imgFailed) {
    return (
      <div className="flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden bg-surface2 border border-stroke"
        style={{ width: size, height: size }}>
        <img src={`https://www.google.com/s2/favicons?domain=${brand.domain}&sz=64`}
          alt={merchant} width={Math.round(size * 0.62)} height={Math.round(size * 0.62)}
          style={{ objectFit: "contain" }} loading="lazy"
          onError={() => setImgFailed(true)} />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: brand?.color || `hsl(${hue}, 55%, 45%)`, fontSize: size * 0.32, letterSpacing: "0.02em" }}>
      {initials}
    </div>
  );
}
