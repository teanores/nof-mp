import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.NOF_MP_E2E_PORT ?? "3300");
const baseURL = `http://127.0.0.1:${port}`;
const localDatabaseUrl = process.env.NOF_LOCAL_DATABASE_URL ?? "postgresql://nof_local:nof_local@localhost:15432/nof_local";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      NOF_AUTH_SECRET_KEY: "nof-local-dragon-forge-secret-change-me",
      NEXT_PUBLIC_PLATFORM_ORIGIN: baseURL,
      NOF_HT_ORIGIN: "http://127.0.0.1:9",
      NOF_LOCAL_DATABASE_URL: localDatabaseUrl,
      NOF_PLATFORM_DATABASE_URL: localDatabaseUrl,
      NOF_PLATFORM_DB_SCHEMA: "nof_platform_e2e",
      NOF_PLATFORM_MCP_TOKEN_SECRET: "nof-local-mcp-token-secret-change-me",
      NOF_PLATFORM_OAUTH_JWT_SECRET: "nof-local-oauth-jwt-secret-change-me",
      SECRET_KEY: "nof-local-dragon-forge-secret-change-me",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
