import type { Page } from '@playwright/test';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { expect, test } from 'test/e2e/playwright/extenders/testExtend';
import { type } from 'test/e2e/playwright/helpers/actions';
import { intercept, interceptAltinnAppGlobalData } from 'test/e2e/playwright/helpers/network';
import { startAppInstance } from 'test/e2e/playwright/helpers/startAppInstance';

import type { AltinnAppGlobalData } from 'src/global';

const appFrontend = new AppFrontend();

async function setAutoSaveBehavior(page: Page, autoSaveBehavior: 'onChangeFormData' | 'onChangePage') {
  await interceptAltinnAppGlobalData(page, (globalData: AltinnAppGlobalData) => {
    globalData.ui.settings ??= {
      hideCloseButton: false,
      showLanguageSelector: false,
      showExpandWidthButton: false,
      expandedWidth: false,
      showProgress: true,
      autoSaveBehavior: 'onChangePage',
      taskNavigation: [],
    };
    globalData.ui.settings.autoSaveBehavior = autoSaveBehavior;
  });
}

test.describe('Auto save behavior', () => {
  test('onChangeFormData: Should save form data when interacting with form element(input)', async ({ page }) => {
    const putFormData = await intercept(page, { method: 'POST', url: '**/data/**' });
    await setAutoSaveBehavior(page, 'onChangeFormData');
    await startAppInstance(page, appFrontend.apps.anonymousStateless, { user: null });

    await type(page.locator(appFrontend.stateless.name), 'Per');
    await putFormData.wait();
    expect(putFormData.requests.length).toBe(1);
    await page
      .getByRole('radiogroup', { name: /^Velg kjønn\s*Valgfritt$/ })
      .getByRole('radio', { name: 'mann', exact: true })
      .check();
    await putFormData.wait();
    expect(putFormData.requests.length).toBe(2);
    await page.getByRole('button', { name: 'Neste', exact: true }).click();
    await expect(page.getByText('Welcome to page 2', { exact: true })).toBeAttached();
  });

  test('onChangePage: Should not save form when interacting with form element(input), but should save on navigating between pages', async ({
    page,
  }) => {
    const putFormData = await intercept(page, { method: 'POST', url: '**/data/**' });
    await setAutoSaveBehavior(page, 'onChangePage');
    await startAppInstance(page, appFrontend.apps.anonymousStateless, { user: null });

    await type(page.locator(appFrontend.stateless.name), 'Per');
    // The Cypress test waits a fixed second to be sure no request is sent to the backend. Proving that nothing happens
    // needs a time window, so this watches for a save for the same second, and fails as soon as one is sent.
    await putFormData.expectNoRequestFor(1000);
    expect(putFormData.requests.length).toBe(0);
    await page
      .getByRole('radiogroup', { name: /^Velg kjønn\s*Valgfritt$/ })
      .getByRole('radio', { name: 'mann', exact: true })
      .check();
    await page.getByRole('button', { name: 'Neste', exact: true }).click();
    await expect(page.getByText('Welcome to page 2', { exact: true })).toBeAttached();
    await putFormData.wait();
    expect(putFormData.requests.length).toBe(1);
  });
});
