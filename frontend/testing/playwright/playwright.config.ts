import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { ExtendedTestOptions } from './extenders/testExtend';

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
      testDir: './integration/create-app-and-simple-schema/',
      testMatch: '*.spec.ts',
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
      testDir: './integration/create-app-and-simple-schema/',
      testMatch: '*simple-app-test.teardown.ts',
      use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        testAppName: 'simple-app-test',
      },
    },
  ],
});

