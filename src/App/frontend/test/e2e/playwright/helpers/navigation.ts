import type { Locator, Page } from '@playwright/test';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { escapeRegex, type } from 'test/e2e/playwright/helpers/actions';
import { expect } from 'test/e2e/playwright/helpers/assertions';
import { intercept, staticResponse } from 'test/e2e/playwright/helpers/network';
import { startAppInstance } from 'test/e2e/playwright/helpers/startAppInstance';

const appFrontend = new AppFrontend();

export type FrontendTestTask = 'message' | 'changename' | 'group' | 'likert' | 'datalist';

const taskNames: { [key in FrontendTestTask]?: string } = {
  changename: 'Endring av navn (Task_2)',
  group: 'Repeterende grupper (Task_3)',
  likert: 'Likert (Task_4)',
  datalist: 'List (Task_5)',
};

/** Starts ttd/frontend-test and skips ahead to a task, like cy.goto(). */
export async function goto(page: Page, task: FrontendTestTask) {
  await intercept(page, { url: '**/active' }, staticResponse({ body: [] }));
  await startAppInstance(page, appFrontend.apps.frontendTest);
  await expect(page.locator('#finishedLoading')).toBeAttached();

  const nextTask = taskNames[task];
  if (nextTask) {
    await page.getByRole('button', { name: 'Velg neste steg', exact: true }).click();
    await page.getByRole('radio', { name: nextTask, exact: true }).click();
    await page.getByRole('button', { name: 'Gå til', exact: true }).click();
    await expect(page.locator('#finishedLoading')).toBeAttached();
  }

  await expect(page.getByRole('progressbar')).toHaveCount(0);
}

/**
 * Loads the 'changename' task, fills in what its validations require, and then enables and navigates to one of the
 * initially hidden pages that ttd/frontend-test uses for new test cases. Like cy.gotoHiddenPage().
 */
export async function gotoHiddenPage(page: Page, target: string) {
  await goto(page, 'changename');
  await type(page.locator(appFrontend.changeOfName.newFirstName), 'a');
  await page.getByRole('tab', { name: /nytt etternavn/i }).click();
  await type(page.locator(appFrontend.changeOfName.newLastName), 'a');
  await page
    .locator(appFrontend.changeOfName.confirmChangeName)
    .getByRole('checkbox', { name: /Ja[a-z, ]*/ })
    .check();
  await page.locator(`[type=checkbox][name=choose-extra][value=${target}]`).check();
  await gotoNavPage(page, target);
}

/** Finds the navigation menu button for a page, like cy.navPage(). */
export async function navPage(page: Page, pageName: string): Promise<Locator> {
  const width = await page.evaluate(() => window.innerWidth);
  if (width < 768) {
    const mobileMenu = page.locator(appFrontend.navMobileMenu);
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'false');
    await mobileMenu.click();
  }
  return page
    .locator(appFrontend.navMenu)
    .getByRole('button', { name: new RegExp(`^\\d+\\. ${escapeRegex(pageName)}$`) });
}

/** Clicks a page in the navigation menu and waits until it is shown, like cy.gotoNavPage(). */
export async function gotoNavPage(page: Page, pageName: string) {
  await (await navPage(page, pageName)).click();
  await expect(await navPage(page, pageName)).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
}
