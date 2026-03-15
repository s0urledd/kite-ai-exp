import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        kite: {
          gold: "var(--kite-gold)",
          "gold-light": "var(--kite-gold-light)",
          "gold-dim": "var(--kite-gold-dim)",
          "gold-faint": "var(--kite-gold-faint)",
          bg: "var(--kite-bg)",
          surface: "var(--kite-surface)",
          "surface-hover": "var(--kite-surface-hover)",
          border: "var(--kite-border)",
          "border-light": "var(--kite-border-light)",
          text: "var(--kite-text)",
          "text-secondary": "var(--kite-text-secondary)",
          "text-muted": "var(--kite-text-muted)",
          "accent-gold": "var(--kite-accent-gold)",
          "accent-teal": "var(--kite-accent-teal)",
          "accent-emerald": "var(--kite-accent-emerald)",
          "accent-lavender": "var(--kite-accent-lavender)",
        },
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
