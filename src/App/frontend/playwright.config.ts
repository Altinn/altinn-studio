import { defineConfig } from '@playwright/test';
import type { LaunchOptions } from '@playwright/test';

import { environment } from './test/e2e/playwright/helpers/environment';

const launchOptions: LaunchOptions = {
  // interceptAltinnAppGlobalData() serves the app's HTML page from the test. Chrome does not know which address space
  // such a page comes from, and its Local Network Access checks then block the frontend's scripts on localhost. The
  // Cypress config turns off all of web security in Chrome, which also turns off these checks.
  args: ['--disable-features=LocalNetworkAccessChecks'],
};

// The CI runner image and the agent sandbox set CHROME_PATH to a Chrome for Testing binary. Elsewhere, use the
// installed Chrome, so that nobody has to download Playwright's own browsers.
const browser: { channel?: string; launchOptions: LaunchOptions } = process.env.CHROME_PATH
  ? { launchOptions: { ...launchOptions, executablePath: process.env.CHROME_PATH } }
  : { channel: 'chrome', launchOptions };

const reportDir = 'test/reports/playwright';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  testDir: 'test/e2e/playwright/tests',
  testMatch: '**/*.spec.ts',
  tsconfig: 'test/e2e/playwright/tsconfig.json',
  outputDir: 'test/playwright-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Each command in Cypress may take up to 20 seconds, and there is no limit for a whole test.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [
    [process.env.CI ? 'line' : 'list'],
    ['html', { open: 'never', outputFolder: `${reportDir}/html` }],
    ['json', { outputFile: `${reportDir}/results.json` }],
    ['junit', { outputFile: `${reportDir}/junit.xml` }],
  ],
  use: {
    ...browser,
    baseURL: environment.baseUrl,
    viewport: { width: 1536, height: 768 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
