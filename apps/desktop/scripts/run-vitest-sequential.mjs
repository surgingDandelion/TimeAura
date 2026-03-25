import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const srcRoot = path.join(projectRoot, "src");
const vitestEntrypoint = path.join(projectRoot, "node_modules", "vitest", "vitest.mjs");

async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectTestFiles(fullPath);
      }

      if (entry.isFile() && (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx"))) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat().sort();
}

function runVitestForFile(testFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [vitestEntrypoint, "run", path.relative(projectRoot, testFile)], {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Vitest failed for ${path.relative(projectRoot, testFile)} with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  const testFiles = await collectTestFiles(srcRoot);

  if (testFiles.length === 0) {
    console.log("No test files found.");
    return;
  }

  for (const file of testFiles) {
    console.log(`\n[timeaura-test] Running ${path.relative(projectRoot, file)}`);
    await runVitestForFile(file);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
