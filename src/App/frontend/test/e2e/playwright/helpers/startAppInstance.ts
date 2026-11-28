import type { Page } from '@playwright/test';

import { expect } from 'test/e2e/playwright/helpers/assertions';
import { userLogin } from 'test/e2e/playwright/helpers/auth';
import { environment, getTargetUrl } from 'test/e2e/playwright/helpers/environment';
import type { TestUser } from 'test/e2e/playwright/helpers/auth';

export type StartAppInstanceOptions = {
  /** User to log in as. Pass null to start the app without logging in. */
  user?: TestUser | null;
  authenticationLevel?: '0' | '1' | '2';
  /** A URL suffix, for example to start a specific instance */
  urlSuffix?: string;
};

/**
 * Logs in and opens the app, like cy.startAppInstance().
 *
 * Tenor users are left out of the pilot: on localtest the Cypress command logs in with the user from the config file
 * whenever both are set, and the pilot does not log in to tt02.
 */
export async function startAppInstance(
  page: Page,
  appName: string,
  { user = 'default', authenticationLevel = '1', urlSuffix = '' }: StartAppInstanceOptions = {},
) {
  // Each test has a new browser context, so this only matters when a test starts an app more than once.
  if (environment.isLocaltest) {
    await page.context().clearCookies({ domain: 'local.altinn.cloud' });
  }

  if (user) {
    await userLogin(page, { user, authenticationLevel });
  }

  await page.goto(getTargetUrl(appName) + urlSuffix);

  // Make sure the app has started loading before continuing
  await expect(page.getByTestId('presentation')).toBeAttached();
}
