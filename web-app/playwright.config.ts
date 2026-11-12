import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E for the web app.
 *
 * Runs against the local Vite dev server. On localhost the app talks to
 * http://localhost:8000, which the tests intercept (see e2e/fixtures.ts), so
 * these tests are deterministic and need no backend, Supabase, or Google login.
 * Backend behaviour against real services is covered by backend/tests/e2e.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
