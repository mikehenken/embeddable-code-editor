import { defineConfig, devices } from '@playwright/test';

/**
 * E2E and embed-verification tests for embeddable-code-editor.
 * Serves the repo root so /dist and /examples / e2e/fixtures resolve correctly after build.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3123',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx serve . -l 3123',
    url: 'http://localhost:3123',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
