import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { expect, test } from 'test/e2e/playwright/extenders/testExtend';
import { dsSelect } from 'test/e2e/playwright/helpers/form';
import { startAppInstance } from 'test/e2e/playwright/helpers/startAppInstance';

const appFrontend = new AppFrontend();

test.describe('Anonymous (stateless) - Options', () => {
  test('should support fetching option list and changing its value', async ({ page }) => {
    await startAppInstance(page, appFrontend.apps.anonymousStateless, { user: null });
    const dropdownComponent = appFrontend.stateless.dropdown;

    await expect(page.locator(dropdownComponent)).toBeVisible();
    await expect(page.locator(dropdownComponent)).toHaveValue('');

    await dsSelect(page, dropdownComponent, 'test@test.com');
    await expect(page.locator(dropdownComponent)).toHaveValue('test@test.com');
  });
});
