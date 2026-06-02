import { defineConfig } from 'playwright/test';

const clientPort = Number(process.env.CLIENT_PORT ?? 5174);
const baseURL = `http://127.0.0.1:${clientPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-dev.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
