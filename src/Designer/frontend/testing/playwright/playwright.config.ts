import { defineConfig, devices, type Project } from '@playwright/test';
import { config } from 'dotenv';
import type { ExtendedTestOptions } from './extenders/testExtend';
import { AppNames } from './enum/AppNames';
import { TestNames } from './enum/TestNames';
import { AppTemplate } from './enum/AppTemplate';

config();

// CI runs one job per app template, so each job only spins up the projects for its own template.
// Projects without an explicit template (setup, login/logout) always run.
const selectedTemplates: string[] = (
  process.env.PLAYWRIGHT_APP_TEMPLATES ?? `${AppTemplate.V8},${AppTemplate.V9}`
)
  .split(',')
  .map((template) => template.trim())
  .filter(Boolean);

const selectProjects = (
  projects: Array<Project<ExtendedTestOptions>>,
): Array<Project<ExtendedTestOptions>> => {
  const selectedProjects = projects.filter(
    (project) =>
      !project.use?.testAppTemplate || selectedTemplates.includes(project.use.testAppTemplate),
  );
  const selectedNames = new Set(selectedProjects.map((project) => project.name));

  return selectedProjects.map((project) => ({
    ...project,
    dependencies: project.dependencies?.filter((dependency) => selectedNames.has(dependency)),
  }));
};

export default defineConfig<ExtendedTestOptions>({
  use: {
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    trace: 'on-first-retry',
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
    screenshot: 'only-on-failure',
    channel: 'chrome',
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Github actions always use only 1, so we set to 1 locally as well
  reporter: 'html',

  projects: selectProjects([
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
      name: TestNames.DATA_MODEL_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/data-model/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.DATA_MODEL_V8_APP,
        testAppTemplate: AppTemplate.V8,
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.DASHBOARD_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/dashboard/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.DASHBOARD_V8_APP,
        testAppTemplate: AppTemplate.V8,
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/main-navigation-between-sub-apps/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.MAIN_NAVIGATION_V8_APP,
        testAppTemplate: AppTemplate.V8,
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.GIT_SYNC_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/git-sync/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.GIT_SYNC_V8_APP,
        testAppTemplate: AppTemplate.V8,
        headless: true,
      },
    },
    {
      name: TestNames.GIT_SYNC,
      dependencies: [TestNames.SETUP],
      testDir: './tests/git-sync/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.GIT_SYNC_APP,
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.UI_EDITOR_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/ui-editor/',
      testMatch: '*.spec.ts',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.UI_EDITOR_V8_APP,
        testAppTemplate: AppTemplate.V8,
        headless: true,
      },
    },
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.APP_SETTINGS_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/app-settings/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.APP_SETTINGS_V8_APP,
        testAppTemplate: AppTemplate.V8,
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.TEXT_EDITOR_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/text-editor/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.TEXT_EDITOR_V8_APP,
        testAppTemplate: AppTemplate.V8,
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.PROCESS_EDITOR_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/process-editor/',
      testMatch: '*.spec.ts',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.PROCESS_EDITOR_V8_APP,
        testAppTemplate: AppTemplate.V8,
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
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.ORG_LIBRARY_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/org-library/',
      testMatch: '*.spec.ts',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.ORG_LIBRARY_V8,
        testAppTemplate: AppTemplate.V8,
        headless: true,
      },
    },
    {
      name: TestNames.ORG_LIBRARY,
      dependencies: [TestNames.SETUP],
      testDir: './tests/org-library/',
      testMatch: '*.spec.ts',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.ORG_LIBRARY,
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.BRANCHING_V8,
      dependencies: [TestNames.SETUP],
      testDir: './tests/branching/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.BRANCHING_V8_APP,
        testAppTemplate: AppTemplate.V8,
        headless: true,
      },
    },
    {
      name: TestNames.BRANCHING,
      dependencies: [TestNames.SETUP],
      testDir: './tests/branching/',
      testMatch: '*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/user.json',
        testAppName: AppNames.BRANCHING_APP,
        testAppTemplate: AppTemplate.V9,
        headless: true,
      },
    },
    {
      name: TestNames.LOGOUT,
      dependencies: [
        TestNames.SETUP,
        TestNames.CREATE_APP_ONLY,
        TestNames.DATA_MODEL_V8,
        TestNames.DATA_MODEL,
        TestNames.DASHBOARD_V8,
        TestNames.DASHBOARD,
        TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS_V8,
        TestNames.MAIN_NAVIGATION_BETWEEN_SUB_APPS,
        TestNames.GIT_SYNC_V8,
        TestNames.GIT_SYNC,
        TestNames.UI_EDITOR_V8,
        TestNames.UI_EDITOR,
        TestNames.APP_SETTINGS_V8,
        TestNames.APP_SETTINGS,
        TestNames.TEXT_EDITOR_V8,
        TestNames.TEXT_EDITOR,
        TestNames.PROCESS_EDITOR_V8,
        TestNames.PROCESS_EDITOR,
        TestNames.ORG_LIBRARY_V8,
        TestNames.ORG_LIBRARY,
        TestNames.BRANCHING_V8,
        TestNames.BRANCHING,
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
  ]),
});
