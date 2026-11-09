import type { Config } from "tailwindcss";

/** Shared Tailwind preset: ASOTECH palette, typography and component radii. */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B2F4F", 50: "#EEF3F8", 100: "#D6E2EE", 200: "#A9C0D8", 300: "#7A9BBE", 400: "#46698F", 500: "#1E4A73", 600: "#0B2F4F", 700: "#092741", 800: "#071E33", 900: "#041421" },
        brand: { orange: "#F28C1E", "orange-dark": "#D97706" },
        cloud: "#F3F6FA",
        slate2: "#5B6B7B",
        ok: "#1E9E5A",
        warn: "#C2640A",
        bad: "#C0392B",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,47,79,.06), 0 8px 24px rgba(11,47,79,.08)",
      },
      borderRadius: { xl2: "1rem" },
    },
  },
};

export default preset;
