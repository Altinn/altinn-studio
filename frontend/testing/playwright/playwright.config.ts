import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import type { ExtendedTestOptions } from './extenders/testExtend';
import { AppNames } from './enum/AppNames';
import { TestNames } from './enum/TestNames';

config();

export default defineConfig<ExtendedTestOptions>({
  use: {
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    trace: 'on-first-retry',
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  projects: [
    { name: TestNames.SETUP, testMatch: /.*\.setup\.ts/ },
    {
      name: TestNames.CREATE_APP_ONLY,
      dependencies: [TestNames.SETUP],
      testDir: './tests/create-app-only/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.CREATE_APP_ONLY,
        headless: true,
      },
    },
    {
      name: TestNames.DATA_MODEL,
      dependencies: [TestNames.SETUP],
      testDir: './tests/data-model/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.DATA_MODEL_APP,
        headless: true,
      },
    },
    {
      name: TestNames.DASHBOARD,
      dependencies: [TestNames.SETUP],
      testDir: './tests/dashboard/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.DASHBOARD_APP,
        headless: true,
      },
    },
    {
      name: TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS,
      dependencies: ['setup'],
      testDir: './tests/main-navigation-between-sub-apps/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.MAIN_NAVIGATION_APP,
        headless: true,
      },
    },
    {
      name: TestNames.GIT_SYNC,
      dependencies: ['setup'],
      testDir: './tests/git-sync/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.GIT_SYNC_APP,
        headless: true,
      },
    },
    {
      name: TestNames.LOGOUT_AND_INVALID_LOGIN_ONLY,
      // Add ALL other test names here to make sure that the log out test is the last test to be executed
      dependencies: [
        TestNames.SETUP,
        TestNames.CREATE_APP_ONLY,
        TestNames.DASHBOARD,
        TestNames.DATA_MODEL,
        TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS,
        TestNames.GIT_SYNC,
      ],
      testDir: './tests/logout-and-invalid-login-only/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        headless: true,
      },
    },
  ],
});
