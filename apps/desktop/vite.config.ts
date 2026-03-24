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
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
