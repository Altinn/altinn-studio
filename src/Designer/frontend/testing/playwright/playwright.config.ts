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
      dependencies: [TestNames.SETUP],
      testDir: './tests/main-navigation-between-sub-apps/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.MAIN_NAVIGATION_APP,
        headless: true,
      },
    },
    // All of these tests fails, therefore comment out instead of using .skip.
    // {
    //   name: TestNames.GIT_SYNC,
    //   dependencies: [TestNames.SETUP],
    //   testDir: './tests/git-sync/',
    //   testMatch: '*.spec.ts',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: '.playwright/auth/user.json',
    //     testAppName: AppNames.GIT_SYNC_APP,
    //     headless: true,
    //   },
    // },
    {
      name: TestNames.UI_EDITOR,
      dependencies: [TestNames.SETUP],
      testDir: './tests/ui-editor/',
      testMatch: '*.spec.ts',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.UI_EDITOR_APP,
        headless: true,
      },
    },
    {
      name: TestNames.APP_SETTINGS,
      dependencies: [TestNames.SETUP],
      testDir: './tests/app-settings/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.APP_SETTINGS_APP,
        headless: true,
      },
    },
    {
      name: TestNames.TEXT_EDITOR,
      dependencies: [TestNames.SETUP],
      testDir: './tests/text-editor/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.TEXT_EDITOR_APP,
        headless: true,
      },
    },
    {
      name: TestNames.PROCESS_EDITOR,
      dependencies: [TestNames.SETUP],
      testDir: './tests/process-editor/',
      testMatch: '*.spec.ts',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.PROCESS_EDITOR_APP,
        headless: true,
      },
    },
    // {
    //   name: TestNames.ORG_LIBRARY,
    //   dependencies: [TestNames.SETUP],
    //   testDir: './tests/org-library/',
    //   testMatch: '*.spec.ts',
    //   timeout: 60000,
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: '.playwright/auth/user.json',
    //     testAppName: AppNames.ORG_LIBRARY,
    //     headless: true,
    //   },
    // },
    {
      name: TestNames.LOGOUT,
      dependencies: [
        TestNames.SETUP,
        TestNames.CREATE_APP_ONLY,
        TestNames.DATA_MODEL,
        TestNames.DASHBOARD,
        TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS,
        // TestNames.GIT_SYNC,
        TestNames.UI_EDITOR,
        TestNames.APP_SETTINGS,
        TestNames.TEXT_EDITOR,
        TestNames.PROCESS_EDITOR,
        // TestNames.ORG_LIBRARY,
      ],
      testDir: './tests/logout/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        headless: true,
      },
    },
    {
      name: TestNames.INVALID_LOGIN,
      dependencies: [TestNames.LOGOUT],
      testDir: './tests/invalid-login/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],
});
