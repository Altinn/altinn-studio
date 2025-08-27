import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { TestNames } from './enum/TestNames';

config();

export default defineConfig({
  use: {
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    trace: 'on-first-retry',
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
    screenshot: 'only-on-failure',
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Github actions always use only 1, so we set to 1 locally as well
  reporter: 'html',

  projects: [
    { name: TestNames.SETUP, testMatch: /.*\.setup\.ts/ },
    {
      name: TestNames.CREATE_RESOURCE,
      dependencies: [TestNames.SETUP],
      testDir: './tests/create-resource/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        headless: true,
      },
    },
    {
      name: TestNames.VALIDATE_RESOURCE,
      dependencies: [TestNames.SETUP],
      testDir: './tests/validate-resource/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        headless: true,
      },
    },
  ],
});
