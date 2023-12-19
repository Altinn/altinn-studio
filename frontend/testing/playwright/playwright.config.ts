import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

type ExtendedTestOptions = {
  testAppName: string;
}

config();


export default defineConfig<ExtendedTestOptions>({
  testDir: './integration',
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
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
        storageState: '.playwright/auth/user.json',
        headless: false,
        testAppName: 'simple-app-test',
      },
    },
  ],
});
