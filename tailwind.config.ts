import type { Config } from "tailwindcss";

const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: c("background"),
        foreground: c("foreground"),
        surface: c("surface"),
        sidebar: c("sidebar"),
        muted: { DEFAULT: c("muted"), foreground: c("muted-foreground") },
        border: c("border"),
        ring: c("ring"),
        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },
        work: { DEFAULT: c("work"), soft: c("work-soft") },
        personal: { DEFAULT: c("personal"), soft: c("personal-soft") },
        cool: c("cool"),
        waiting: { DEFAULT: c("waiting"), soft: c("waiting-soft") },
        hover: c("hover"),
        urgent: { DEFAULT: c("urgent"), soft: c("urgent-soft") },
        done: { DEFAULT: c("done"), soft: c("done-soft") },
      },
      boxShadow: {
        btn: "inset 0 1px 0 hsl(0 0% 100% / 0.12), 0 1px 2px hsl(var(--shadow) / 0.2), 0 6px 14px -6px hsl(var(--shadow) / 0.35)",
        soft: "0 1px 2px hsl(var(--shadow) / 0.06), 0 2px 8px -2px hsl(var(--shadow) / 0.08)",
        pop: "0 24px 60px -12px hsl(var(--shadow) / 0.28), 0 0 0 1px hsl(var(--border))",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideIn: { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "none" } },
        menuIn: { from: { opacity: "0", transform: "translateY(-6px) scale(.98)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.82)" }, "55%": { transform: "scale(1.12)" }, "100%": { transform: "scale(1)" } },
        sheetUp: { from: { opacity: "0.6", transform: "translateY(32px)" }, to: { opacity: "1", transform: "none" } },
        draw: { to: { strokeDashoffset: "0" } },
      },
      animation: {
        rise: "rise .28s cubic-bezier(.2,.7,.2,1) both",
        fade: "fade .16s ease both",
        slideIn: "slideIn .22s cubic-bezier(.2,.8,.2,1) both",
        menuIn: "menuIn .16s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .28s cubic-bezier(.3,1.4,.5,1)",
        sheetUp: "sheetUp .26s cubic-bezier(.2,.8,.2,1) both",
        draw: "draw .22s .05s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
