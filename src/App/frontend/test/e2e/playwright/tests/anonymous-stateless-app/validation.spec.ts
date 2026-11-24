import texts from 'test/e2e/fixtures/texts.json' with { type: 'json' };
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { expect, test } from 'test/e2e/playwright/extenders/testExtend';
import { clickAfterScrollingToTop, contains, type } from 'test/e2e/playwright/helpers/actions';
import { exactText } from 'test/e2e/playwright/helpers/assertions';
import { startAppInstance } from 'test/e2e/playwright/helpers/startAppInstance';

const appFrontend = new AppFrontend();

test.describe('Validation in anonymous stateless app', () => {
  test('Should show validation message for missing name', async ({ page, visualTesting }) => {
    await startAppInstance(page, appFrontend.apps.anonymousStateless, { user: null });
    await expect(page.locator(appFrontend.stateless.name)).toBeVisible();
    await expect(page.locator(appFrontend.stateless.name)).toHaveValue('');
    // The error report is only entirely inside the viewport if the click scrolls the page first, the way Cypress does
    await clickAfterScrollingToTop(contains(page.locator(appFrontend.navButtons), 'button', 'Neste'));

    const nameError = page.locator(appFrontend.fieldValidation(appFrontend.stateless.name));

    await expect(page.locator(appFrontend.stateless.name)).toBeVisible();
    await expect(nameError).toHaveText(exactText(texts.requiredFieldName));
    const errorReport = page.locator(appFrontend.errorReport);
    await expect(errorReport).toBeEntirelyInViewport();
    await expect(errorReport).toContainText(texts.errorReport);
    await expect(errorReport).toContainText(texts.requiredFieldName);

    await visualTesting('anonymous:validation');

    await type(page.locator(appFrontend.stateless.name), 'Hello world');
    await expect(nameError).toHaveCount(0);
    await expect(errorReport).toHaveCount(0);

    await contains(page.locator(appFrontend.navButtons), 'button', 'Neste').click();
    await expect(page.locator(appFrontend.navButtons)).toHaveCount(0);
  });
});
