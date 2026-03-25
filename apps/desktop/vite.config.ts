import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@timeaura-core": path.resolve(repoRoot, "drafts/src/index.ts"),
      "@tauri-apps/api": path.resolve(currentDir, "node_modules/@tauri-apps/api"),
      "@tauri-apps/plugin-notification": path.resolve(currentDir, "node_modules/@tauri-apps/plugin-notification"),
      "@tauri-apps/plugin-sql": path.resolve(currentDir, "node_modules/@tauri-apps/plugin-sql"),
      "@tauri-apps/plugin-stronghold": path.resolve(currentDir, "node_modules/@tauri-apps/plugin-stronghold"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/test/**",
      ],
    },
  },
});
