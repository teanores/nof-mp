import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          amber: "var(--color-forge)",
          accent: "var(--color-accent)",
          ink: "var(--color-text)",
          muted: "var(--color-muted)",
          ghost: "var(--color-ghost)",
          line: "var(--color-border)",
          surface: "var(--color-surface)",
          panel: "var(--color-panel)",
        },
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
