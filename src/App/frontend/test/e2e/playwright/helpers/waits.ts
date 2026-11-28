import type { Page } from '@playwright/test';

import { expect } from 'test/e2e/playwright/helpers/assertions';

export type SnapshotViewport = 'desktop' | 'tablet' | 'mobile';
export type ViewportName = SnapshotViewport | 'laptop';

/** Waits for the app to finish saving the form data being edited. */
export async function waitUntilSaved(page: Page) {
  // If the data-unsaved-changes attribute does not exist, the page is not in a data/form state, and we should not
  // wait for it to be saved.
  await expect(page.locator('body')).not.toHaveAttribute('data-unsaved-changes', 'true');

  // There should be no 'NavigationButtons' components that are disabled (another indicator that form data is saving)
  await expect(page.locator('[data-testid=NavigationButtons] button[disabled]')).toHaveCount(0);
}

export async function waitForLoad(page: Page) {
  await expect(page.locator('#finishedLoading')).toBeAttached();
  await expect(page.locator('.loading')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  // An initialOption can cause a save to occur immediately after loading is finished, wait for this to finish as well
  await waitUntilSaved(page);
}

/**
 * Clears all selections and waits for the app to finish loading and stabilizing, before a snapshot or WCAG check.
 */
export async function clearSelectionAndWait(page: Page, viewport?: ViewportName) {
  await expect(page.locator('#finishedLoading')).toBeAttached();
  await expect(page.getByRole('progressbar')).toHaveCount(0);

  // Blur the focused element, to ensure that we don't get any focus outlines or styles in the snapshot.
  await page.evaluate(() => {
    const focused = document.activeElement;
    if (focused && 'blur' in focused && typeof focused.blur === 'function') {
      focused.blur();
    }
  });
  await expect(page.locator(':focus')).toHaveCount(0);

  // Wait for elements marked as loading are not loading anymore
  await expect(page.locator('[data-is-loading=true]')).toHaveCount(0);

  if (viewport) {
    await expect(page.locator(`html.viewport-is-${viewport}`)).toBeVisible();
  }

  // Work around slow state updates in Dropdown. The Cypress command also tries to wait for preselected options and
  // the active descendant, but those checks run as nested Cypress commands whose results cy.waitUntil() never sees,
  // so all it waits for is that every Dropdown has rendered its input. This port waits for the same thing.
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-componenttype="Dropdown"]')).every((dropdown) =>
          dropdown.querySelector('input'),
        ),
      ),
    )
    .toBe(true);
}
