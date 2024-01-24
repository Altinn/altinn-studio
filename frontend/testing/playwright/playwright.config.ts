import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import type { ExtendedTestOptions } from './extenders/testExtend';
import { AppNames } from './enum/AppNames';

config();

export default defineConfig<ExtendedTestOptions>({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'create-app-only',
      dependencies: ['setup'],
      testDir: './tests/create-app-only/',
      testMatch: '*.spec.ts',
      teardown: 'teardown-create-app-only',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.CREATE_APP_ONLY,
        headless: true,
      },
    },
    {
      name: 'teardown-create-app-only',
      testDir: './tests/create-app-only/',
      testMatch: '*create-app-only.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: AppNames.CREATE_APP_ONLY,
      },
    },
    {
      name: 'data-model',
      dependencies: ['setup'],
      testDir: './tests/data-model/',
      testMatch: '*.spec.ts',
      teardown: 'teardown-data-model',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.DATA_MODEL_APP,
        headless: true,
      },
    },
    {
      name: 'teardown-data-model',
      testDir: './tests/data-model/',
      testMatch: '*data-model.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: AppNames.DATA_MODEL_APP,
      },
    },
    {
      name: 'dashboard',
      dependencies: ['setup'],
      testDir: './tests/dashboard/',
      testMatch: '*.spec.ts',
      teardown: 'teardown-dashboard',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.DASHBOARD_APP,
        headless: true,
      },
    },
    {
      name: 'teardown-dashboard',
      testDir: './tests/dashboard/',
      testMatch: '*dashboard.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: AppNames.DASHBOARD_APP,
      },
    },
  ],
});
