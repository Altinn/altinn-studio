import { test as base } from '@playwright/test';
import { AppTemplate } from '../enum/AppTemplate';

export type ExtendedTestOptions = {
  testAppName: string;
  testAppTemplate: AppTemplate;
};

export type ExtendedTestFixtures = {
  defaultLayoutSet: string;
};

const defaultLayoutSetPerAppTemplate: Record<AppTemplate, string> = {
  [AppTemplate.V8]: 'form',
  [AppTemplate.V9]: 'Task_1',
};

// Extends the default test to support custom parameters such as appName for our test app
export const test = base.extend<ExtendedTestOptions & ExtendedTestFixtures>({
  testAppName: [process.env.PLAYWRIGHT_DESIGNER_APP_NAME, { option: true }],
  // Latest app version, matching the unsuffixed project names. The backend default is still v8, so
  // a project that wants v8 has to say so explicitly.
  testAppTemplate: [AppTemplate.V9, { option: true }],
  // Named provide, since eslint reads a use-prefixed call as a React hook
  defaultLayoutSet: async ({ testAppTemplate }, provide) => {
    await provide(defaultLayoutSetPerAppTemplate[testAppTemplate]);
  },
});

const describe = test.describe;
export { describe };
