import { test as base } from '@playwright/test';

export type ExtendedTestOptions = {
  testAppName: string;
};

// Extends the default test to support custom parameters such as appName for our test app
export const test = base.extend<ExtendedTestOptions>({
  testAppName: [process.env.PLAYWRIGHT_DESIGNER_APP_NAME, { option: true }],
});

const describe = test.describe;
export { describe };
