import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { clickBodyBottomRight, type } from 'test/e2e/playwright/helpers/actions';
import { exactText, expect } from 'test/e2e/playwright/helpers/assertions';
import { navPage } from 'test/e2e/playwright/helpers/navigation';
import { waitUntilSaved } from 'test/e2e/playwright/helpers/waits';

const appFrontend = new AppFrontend();
const ACTION_TIMEOUT = 20_000;

/** Absolute path to a file in test/e2e/fixtures */
export function fixturePath(fileName: string) {
  return path.resolve(import.meta.dirname, '../../fixtures', fileName);
}

/** Waits until a design system element (Combobox, etc.) is ready to be clicked, like cy.dsReady(). */
export async function dsReady(page: Page, selector: string) {
  // In case the option is dynamic, wait for save and progress bars to go away, otherwise the component could
  // rerender after opening, causing it to close again
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator(selector)).not.toBeDisabled();
  await waitUntilSaved(page);
}

/** Clears a design system element (Combobox, etc.), like cy.dsClear(). */
export async function dsClear(page: Page, selector: string) {
  const input = page.locator(selector);

  // Clear the input value and trigger input event to reset dropdown's internal state
  await input.evaluate((element: HTMLInputElement) => {
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  });

  // Close any open dropdowns by clicking outside
  await clickBodyBottomRight(page);

  // Additional step to ensure dropdown is reset
  await input.click();
  await type(input, '{esc}');
  await expect(page.locator('u-datalist:popover-open')).toHaveCount(0);
}

/** Selects an option in a design system dropdown, like cy.dsSelect(). */
export async function dsSelect(page: Page, selector: string, value: string | RegExp, debounce = true) {
  await dsReady(page, selector);
  // Clear the input value before selecting a new option because the previous value acts as a filter
  // and prevents the new option from being displayed.
  await dsClear(page, selector);
  await page.locator(selector).click();

  // Native popovers are rendered in the top layer. Scope the lookup to the open list, and click without the
  // actionability checks like the Cypress command does.
  //
  // The Cypress command finds the option by its accessible name. Testing Library leaves CSS generated content out of
  // accessible names, while Playwright includes it, so an option with a link is named 'test@test.com (external link)'
  // here. Matching the option's text instead gives the name Testing Library computes for these options.
  await page
    .locator('u-datalist:popover-open')
    .getByRole('option')
    .filter({ hasText: typeof value === 'string' ? exactText(value) : value })
    .click({ force: true });
  if (debounce) {
    await clickBodyBottomRight(page);
  }
}

/**
 * Replaces the value of a number formatted input without first saving an empty value, like cy.numberFormatReplace().
 * Delayed status announcements can steal focus while typing, so the whole action is retried if the input missed keys
 * or was replaced during typing.
 */
export async function numberFormatReplace(input: Locator, value: string) {
  const deadline = Date.now() + ACTION_TIMEOUT;
  const expectedKeys = value.length || 1;

  for (;;) {
    if (!value && (await input.inputValue()) === '') {
      return;
    }

    const element = await input.elementHandle();
    if (!element) {
      throw new Error(`Could not find ${input}`);
    }
    await element.evaluate((node) => {
      const state = { received: 0, listener: (_event: KeyboardEvent) => undefined as void };
      state.listener = (event: KeyboardEvent) => {
        if (event.key.length === 1 || event.key === 'Backspace') {
          state.received++;
        }
      };
      node.addEventListener('keydown', state.listener);
      (node as unknown as { __numberFormatKeys: typeof state }).__numberFormatKeys = state;
    });

    // Full selection is preserved by react-number-format. Replacing directly avoids saving an empty integer as zero.
    await type(input, `{selectall}${value || '{backspace}'}`);

    const { received, connected } = await element.evaluate((node) => {
      const state = (node as unknown as { __numberFormatKeys: { received: number; listener: EventListener } })
        .__numberFormatKeys;
      node.removeEventListener('keydown', state.listener);
      return { received: state.received, connected: node.isConnected };
    });
    await element.dispose();

    if (received >= expectedKeys && connected) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Could not deliver the number formatting keyboard command to ${input}`);
    }
  }
}

/** Clears a number formatted input, like cy.numberFormatClear(). */
export async function numberFormatClear(input: Locator) {
  await numberFormatReplace(input, '');
}

/**
 * Fills out the 'changename' task in ttd/frontend-test without moving on to the next task, like cy.fillOut('changename').
 * The pilot only ports this task, as it is the only one the ported specs fill out.
 */
export async function fillOutChangeName(page: Page) {
  await expect(page.locator(appFrontend.changeOfName.currentName)).toBeAttached();

  // Fill out the grid first. There are other pages with elements that trigger validation, so filling out the grid
  // first will avoid a lingering validation error on the grid page.
  await (await navPage(page, 'grid')).click();
  const grid = appFrontend.grid;
  await expect(page.locator(grid.totalAmount)).toHaveValue('0 kr');
  await type(page.locator(grid.totalAmount), '1000000');

  // These fields are filled out meticulously, because the number formatting and complex state management as a result
  // of number formatting + data fetched from the server causes them to be very flaky.
  // @see https://github.com/Altinn/app-frontend-react/issues/1520
  for (const [field, percent] of [
    [grid.bolig.percent, '80'],
    [grid.studie.percent, '15'],
    [grid.kredittkort.percent, '5'],
  ] as const) {
    const input = page.locator(field);
    await expect(input).toHaveValue('0 %');
    await type(input, percent);
    await input.blur();
    await expect(input).toHaveValue(`${percent} %`);
  }

  await expect(page.locator(grid.kredittkort.amount)).toHaveValue('50 000 kr');

  await (await navPage(page, 'form')).click();
  await type(page.locator(appFrontend.changeOfName.newFirstName), 'a');
  await page.getByRole('tab', { name: /nytt etternavn/i }).click();
  await type(page.locator(appFrontend.changeOfName.newLastName), 'a');
  await page
    .locator(appFrontend.changeOfName.confirmChangeName)
    .getByRole('checkbox', { name: /Ja[a-z, ]*/ })
    .check();
  await page.locator(appFrontend.changeOfName.reasonRelationship).click();
  await type(page.locator(appFrontend.changeOfName.reasonRelationship), 'test');
  await page.getByRole('button', { name: appFrontend.changeOfName.datePickerButton }).click();
  await page.locator('button[aria-label*="Today"]').click();
  await page.locator(appFrontend.changeOfName.upload).setInputFiles(fixturePath('test.pdf'));

  await (await navPage(page, 'grid')).click();
  await expect(page.locator(grid.kredittkort.percent)).toBeVisible();
}
