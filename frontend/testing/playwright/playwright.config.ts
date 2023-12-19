import { defineConfig, devices, test as base } from '@playwright/test';
import { config } from 'dotenv';

type ExtendedTestOptions = {
  testAppName: string;
};

// Extends the default test to support custom parameters such as appName for our test app
export const test = base.extend<ExtendedTestOptions>({
  testAppName: [process.env.PLAYWRIGHT_DESIGNER_APP_NAME, { option: true }],
});

config();

export default defineConfig<ExtendedTestOptions>({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'simple-schema-app',
      dependencies: ['setup'],
      testDir: './integration',
      teardown: 'teardown-simple-schema-app',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        testAppName: 'simple-app-test',
      },
    },
    {
      name: 'teardown-simple-schema-app',
      testDir: './teardown',
      testMatch: '*simple-app-test.teardown*',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: 'simple-app-test',
      },
    },
  ],
});

