import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      APP_BASE_URL: "http://localhost:3000",
      DATABASE_URL: "",
      PAYPAL_ENV: "sandbox",
      PAYPAL_CLIENT_ID: "",
      PAYPAL_CLIENT_SECRET: "",
      PAYPAL_MERCHANT_ID: "",
      AI_API_KEY: "",
      DEMO_ACCOUNT_PASSWORD: "accesspay-demo-only",
      LOCAL_DATABASE_PATH: join(
        tmpdir(),
        `accesspay-e2e-${process.pid}-${Date.now()}`,
      ),
    },
  },
});
