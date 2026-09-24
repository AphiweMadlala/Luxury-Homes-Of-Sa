// Regression tests for the built site. Run `npm run build` first, then `npm test`.
import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = JSON.parse(readFileSync("site.config.json", "utf8")).BASE_PATH;
const PORT = 4173;
export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  outputDir: "test-results",
  use: { baseURL: `http://localhost:${PORT}${BASE}`, reducedMotion: "reduce" },
  webServer: { command: `node tests/serve.mjs`, env: { PORT: String(PORT) }, url: `http://localhost:${PORT}${BASE}`, reuseExistingServer: true },
});
