import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
});
