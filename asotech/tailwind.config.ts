// Root Tailwind config: re-exports the shared preset so editors and the monorepo root resolve the brand tokens.
// Each app has its own tailwind.config.ts that uses this preset and lists its own content globs.
import type { Config } from "tailwindcss";
import preset from "./packages/configuration/tailwind-preset";

const config: Config = {
  presets: [preset as Config],
  content: ["./apps/**/*.{ts,tsx}", "./packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
