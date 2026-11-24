import texts from 'test/e2e/fixtures/texts.json' with { type: 'json' };
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { expect, test } from 'test/e2e/playwright/extenders/testExtend';
import { type } from 'test/e2e/playwright/helpers/actions';
import { intercept, staticResponse } from 'test/e2e/playwright/helpers/network';
import { startAppInstance } from 'test/e2e/playwright/helpers/startAppInstance';

const appFrontend = new AppFrontend();

test.describe('Anonymous (stateless)', () => {
  test.beforeEach(async ({ page }) => {
    await startAppInstance(page, appFrontend.apps.anonymousStateless, { user: null });
    await expect(page.locator(appFrontend.stateless.name)).toBeVisible();
  });

  test('Prefill from data processing is fetched', async ({ page }) => {
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(239, 239, 239)');
    await expect(page.getByRole('link', { name: /tilbake til innboks/i })).toHaveCount(0);
    await expect(page.locator(appFrontend.profileIconButton)).toHaveCount(0);
    await expect(page.locator(appFrontend.stateless.name)).toHaveValue('');
    await expect(page.locator(appFrontend.stateless.number)).toHaveValue('1234');
    await expect(page.locator(appFrontend.header)).toContainText(appFrontend.apps.anonymousStateless);
    await expect(page.locator(appFrontend.header)).toContainText(texts.ttd);
  });

  test('should trigger data processing on changes in form fields', async ({ page }) => {
    await type(page.locator(appFrontend.stateless.name), 'test');
    await page.locator(appFrontend.stateless.name).blur();
    await expect(page.locator(appFrontend.stateless.name)).toHaveValue('automation');
    await expect(page.locator(appFrontend.stateless.idnummer2)).toHaveValue('1234567890');
  });

  test('rapid form data updates should respect the last user action', async ({ page }) => {
    // Delaying the save operation makes sure we have time to trigger multiple updates.
    // Like in the Cypress test, `{ delay: 200 }` is a static response: the saves get an empty 200 response after
    // 200 ms and never reach the app backend.
    const postData = await intercept(
      page,
      { url: '**/data/anonymous?dataType=default**' },
      staticResponse({ delay: 200 }),
    );
    await page.getByRole('radio', { name: 'kvinne', exact: true }).click();
    await page.getByRole('radio', { name: 'kvinne', exact: true }).blur();
    // Wait for the save to start, but do not wait for it to finish
    await expect.poll(() => postData.requests.length).toBeGreaterThan(0);
    await page.getByRole('radio', { name: 'mann', exact: true }).click();
    await expect.poll(() => postData.requests.length).toBe(2);
    await postData.wait();
    await expect(page.getByRole('radio', { name: 'mann', exact: true })).toBeChecked();
  });

  test('should render iframe with srcdoc and the heading text should be "The red title is rendered within an iframe"', async ({
    page,
    visualTesting,
  }) => {
    await expect(page.locator('iframe')).toBeAttached();
    await expect(page.locator('iframe')).toHaveAttribute('srcdoc');

    // access the content of the iframe
    const iframe = page.frameLocator('iframe');
    await expect.poll(() => iframe.locator('body').evaluate((body) => body.childNodes.length)).toBeGreaterThan(0);
    await expect(
      iframe
        .locator('h1')
        .filter({ hasText: /The red title is rendered within an iframe/ })
        .first(),
    ).toBeAttached();
    await visualTesting('anonymous:iframe');
  });
});
