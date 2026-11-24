import { test as base } from '@playwright/test';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { expect } from 'test/e2e/playwright/helpers/assertions';
import { recordConsoleMessages, unexpectedConsoleMessages } from 'test/e2e/playwright/helpers/consoleMessages';
import { testWcag, visualTesting } from 'test/e2e/playwright/helpers/visualTesting';
import { waitUntilSaved } from 'test/e2e/playwright/helpers/waits';

const appFrontend = new AppFrontend();

type Fixtures = {
  /**
   * Fails the test when the app writes an unexpected message with console.error/warn/info/trace, like
   * cypress-fail-on-console-error does for the Cypress suite (test/e2e/support/index.ts).
   */
  failOnConsoleMessages: void;

  /**
   * After a passing test, waits for the app to save and checks that it shows no error page, like the global
   * afterEach() in test/e2e/support/index.ts.
   */
  checkAppAfterTest: void;

  /** Runs the WCAG tests on the page, like cy.testWcag() */
  testWcag: () => Promise<void>;

  /** Prepares the page for a snapshot and runs the WCAG tests, like cy.visualTesting() */
  visualTesting: (name: string, options?: { wcag?: boolean }) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  failOnConsoleMessages: [
    async ({ context }, provide) => {
      const messages = await recordConsoleMessages(context);
      await provide();
      const unexpected = unexpectedConsoleMessages(messages);
      if (unexpected.length > 0) {
        throw new Error(
          `The app wrote unexpected console messages:\n${unexpected
            .map(({ type, message, url }) => `console.${type} on ${url}:\n${message}`)
            .join('\n\n')}`,
        );
      }
    },
    { auto: true },
  ],

  checkAppAfterTest: [
    // Depends on failOnConsoleMessages so that its console messages are checked too
    async ({ page, failOnConsoleMessages: _ }, provide, testInfo) => {
      await provide();
      if (testInfo.status !== testInfo.expectedStatus) {
        return;
      }
      await waitUntilSaved(page);
      await expect(page.locator(appFrontend.instanceErrorCode)).toHaveCount(0);
    },
    { auto: true },
  ],

  testWcag: async ({ page }, provide, testInfo) => {
    await provide(() => testWcag(page, testInfo));
  },

  visualTesting: async ({ page }, provide, testInfo) => {
    await provide((name, options) => visualTesting(page, testInfo, name, options));
  },
});

export { expect };
