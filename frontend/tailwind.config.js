export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        bg:        "var(--bg)",
        surface:   "var(--surface)",
        surface2:  "var(--surface-2)",
        surface3:  "var(--surface-3)",
        stroke:    "var(--stroke)",
        strokeStrong: "var(--stroke-strong)",
        ink:       "var(--ink)",
        ink2:      "var(--ink-2)",
        muted:     "var(--muted)",
        faint:     "var(--faint)",
        primary:   "var(--primary)",
        success:   "var(--success)",
        danger:    "var(--danger)",
        warning:   "var(--warning)",
        info:      "var(--info)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop:  "var(--shadow-pop)",
      },
      borderRadius: { xl: "10px", "2xl": "14px", "3xl": "18px" },
    },
  },
  plugins: [],
};
