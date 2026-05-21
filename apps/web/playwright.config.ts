import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
    cwd: ".",
  },
  projects: [
    // Desktop baseline.
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Mobile-viewport project — iPhone 13 is 390px wide, the mobile target.
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
