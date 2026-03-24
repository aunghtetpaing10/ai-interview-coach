import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const demoRuntimeStatePath = join(
  process.cwd(),
  ".next",
  "cache",
  `playwright-demo-runtime-${Date.now()}.json`,
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: process.env.CI ? "npm run start" : "npm run dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      env: {
        E2E_DEMO_MODE: "1",
        E2E_DEMO_STATE_PATH: demoRuntimeStatePath,
        INNGEST_DEV: "http://127.0.0.1:8288",
      },
    },
    {
      command: "npm run inngest:dev",
      url: "http://127.0.0.1:8288/health",
      reuseExistingServer: false,
      env: {
        E2E_DEMO_MODE: "1",
        E2E_DEMO_STATE_PATH: demoRuntimeStatePath,
        INNGEST_DEV_PORT: "8288",
        INNGEST_DEV_REPORT_DELAY_MS: "3000",
      },
    },
  ],
});
