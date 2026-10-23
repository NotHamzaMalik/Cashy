import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: process.env.CASHY_TEST_ORIGIN || 'http://localhost:3100', headless: true, channel: 'chrome', viewport: { width: 1440, height: 1100 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node node_modules/next/dist/bin/next start --hostname localhost --port 3100', url: 'http://localhost:3100', reuseExistingServer: !process.env.CI, timeout: 30000 }
});
