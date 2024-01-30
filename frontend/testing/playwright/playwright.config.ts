import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import type { ExtendedTestOptions } from './extenders/testExtend';
import { AppNames } from './enum/AppNames';
import { TestNames } from './enum/TestNames';

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
    { name: TestNames.SETUP, testMatch: /.*\.setup\.ts/ },
    {
      name: TestNames.CREATE_APP_ONLY,
      dependencies: [TestNames.SETUP],
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
      name: TestNames.DATA_MODEL,
      dependencies: [TestNames.SETUP],
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
      name: TestNames.DASHBOARD,
      dependencies: [TestNames.SETUP],
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
    {
      name: TestNames.LOGOUT_AND_INVALID_LOGIN_ONLY,
      // Add ALL other test names here to make sure that the log out test is the last test to be executed
      dependencies: [
        TestNames.SETUP,
        TestNames.CREATE_APP_ONLY,
        TestNames.DASHBOARD,
        TestNames.DATA_MODEL,
      ],
      testDir: './tests/logout-and-invalid-login-only/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        headless: true,
      },
    },
    {
      name: TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS,
      dependencies: ['setup'],
      testDir: './tests/main-navigation-between-sub-apps/',
      testMatch: '*.spec.ts',
      teardown: 'teardown-main-navigation-between-sub-apps',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.MAIN_NAVIGATION_APP,
        headless: true,
      },
    },
    {
      name: 'teardown-main-navigation-between-sub-apps',
      testDir: './tests/main-navigation-between-sub-apps/',
      testMatch: '*main-navigation-between-sub-apps.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: AppNames.MAIN_NAVIGATION_APP,
      },
    },
    {
      name: 'git-sync',
      dependencies: ['setup'],
      testDir: './tests/git-sync/',
      testMatch: '*.spec.ts',
      teardown: 'teardown-git-sync',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.GIT_SYNC_APP,
        headless: true,
      },
    },
    {
      name: 'teardown-git-sync',
      testDir: './tests/git-sync/',
      testMatch: '*git-sync.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: AppNames.GIT_SYNC_APP,
      },
    },
    {
      name: 'settings-modal',
      dependencies: ['setup'],
      testDir: './tests/settings-modal/',
      testMatch: '*.spec.ts',
      teardown: 'teardown-settings-modal',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.SETTINGS_MODAL_APP,
        headless: true,
      },
    },
    {
      name: 'teardown-settings-modal',
      testDir: './tests/settings-modal/',
      testMatch: '*settings-modal.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: AppNames.SETTINGS_MODAL_APP,
      },
    },
  ],
});
