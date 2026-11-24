import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { environment } from 'test/e2e/playwright/helpers/environment';

/** The same user names as `CyUser` in test/e2e/support/auth.ts, with their details in test/e2e/config/<env>.json. */
export type TestUser =
  | 'default'
  | 'manager'
  | 'accountant'
  | 'auditor'
  | 'selfIdentified'
  | 'multiPartyPrompt'
  | 'multiPartyPrompt2'
  | 'doNotPromptParty';

type UserInfo = {
  firstName: string;
  displayName: string;
  localPartyId: string;
};

export function getUserInfo(user: TestUser): UserInfo {
  return {
    firstName: environment.expose[`${user}FirstName`],
    displayName: environment.expose[`${user}FullName`],
    localPartyId: environment.expose[`${user}PartyId`],
  };
}

type LoginParams = {
  user: TestUser;
  authenticationLevel: string;
};

export async function userLogin(page: Page, { user, authenticationLevel }: LoginParams) {
  if (environment.isLocaltest) {
    return logInLocalUser(page, getUserInfo(user).localPartyId, authenticationLevel);
  }

  throw new Error(`Login is not implemented in the Playwright pilot for ${environment.name} (user: ${user})`);
}

async function logInLocalUser(page: Page, userSelect: string, authenticationLevel: string) {
  // Localtest's reauthenticate action sets the same authentication and party cookies as the login form, but responds
  // without redirecting. page.request shares cookies with the browser context, so the next page.goto() is logged in.
  const response = await page.request.post(`${environment.baseUrl}/Home/LogInTestUser`, {
    form: {
      action: 'reauthenticate',
      UserSelect: userSelect,
      AuthenticationLevel: authenticationLevel,
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(204);
}
