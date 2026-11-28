import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export function escapeRegex(text: string) {
  return text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}

/**
 * Types like Cypress' .type(): clicks the element unless it has focus, with the caret after the current value, and
 * then presses one key per character. Supports the special sequences the ported tests use: {selectall},
 * {moveToStart}, {del}, {backspace} and {esc}.
 *
 * Playwright's fill() replaces the whole value at once, and the app saves, formats numbers and validates while the
 * user types, so the tests type key by key. Cypress moves the caret to the end of the value after its click. Moving it
 * from the test after a real click would bypass react-number-format, which corrects the caret on mouseup so that it
 * stays in front of a suffix such as ' %', and it would then drop the next key. So this clicks at the right end of the
 * field instead, as a user would to add to the value, and lets the field place the caret.
 */
export async function type(locator: Locator, text: string) {
  const isFocused = await locator.evaluate((element) => element === element.ownerDocument.activeElement);
  if (!isFocused) {
    const box = await locator.boundingBox();
    await locator.click(box ? { position: { x: Math.max(box.width - 3, 1), y: box.height / 2 } } : undefined);
  }

  const keyboard = locator.page().keyboard;
  for (const token of text.split(/(\{[a-zA-Z]+})/).filter(Boolean)) {
    switch (token) {
      case '{selectall}':
        await locator.evaluate((element) => {
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.select();
          }
        });
        break;
      case '{moveToStart}':
        await locator.evaluate((element) => {
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.setSelectionRange(0, 0);
          }
        });
        break;
      case '{del}':
        await keyboard.press('Delete');
        break;
      case '{backspace}':
        await keyboard.press('Backspace');
        break;
      case '{esc}':
        await keyboard.press('Escape');
        break;
      default:
        if (/^\{[a-zA-Z]+}$/.test(token)) {
          throw new Error(`type() does not support the special sequence ${token}`);
        }
        await keyboard.type(token);
    }
  }
}

/** Cypress' .clear(), which is .type('{selectall}{del}') */
export async function clear(locator: Locator) {
  await type(locator, '{selectall}{del}');
}

/**
 * Cypress' .contains(selector, text) and `selector:contains("text")`: the first element matching the selector whose
 * text contains the given text, case-sensitive. Playwright's hasText with a string ignores case, so this uses a regex.
 */
export function contains(scope: Page | Locator, selector: string, text: string): Locator {
  return scope
    .locator(selector)
    .filter({ hasText: new RegExp(escapeRegex(text)) })
    .first();
}

/**
 * Turns a selector from the page objects that uses jQuery's `:contains("text")` at the end into a locator. Selectors
 * without :contains() are passed through. Playwright's CSS engine does not support :contains().
 */
export function jq(scope: Page | Locator, selector: string): Locator {
  const match = selector.match(/^(.*):contains\("(.*)"\)$/);
  if (!match) {
    return scope.locator(selector);
  }
  return scope.locator(match[1]).filter({ hasText: new RegExp(escapeRegex(match[2])) });
}

/** Cypress' .click('bottomRight') on the body, used to close open dropdowns */
export async function clickBodyBottomRight(page: Page) {
  const body = page.locator('body');
  const box = await body.boundingBox();
  if (!box) {
    throw new Error('The body has no bounding box');
  }
  await body.click({ position: { x: box.width - 1, y: box.height - 1 } });
}

/**
 * Before every action, Cypress scrolls the element to the top of the viewport (its default scrollBehavior). Playwright
 * scrolls only as far as it needs to. Where a test checks what is inside the viewport after an action, the result can
 * depend on that scrolling, so this does what Cypress does before it clicks.
 */
export async function clickAfterScrollingToTop(locator: Locator) {
  await locator.evaluate((element) => element.scrollIntoView());
  await locator.click();
}

/**
 * Clicks an element and waits until that element has left the page, like Cypress' .clickAndGone(). Another element
 * that matches the same locator may take its place, as when the next page has a button with the same name.
 */
export async function clickAndGone(locator: Locator) {
  const element = await locator.elementHandle();
  if (!element) {
    throw new Error(`Could not find ${locator}`);
  }
  await element.click();
  await expect.poll(() => element.evaluate((node) => node.isConnected)).toBe(false);
  await element.dispose();
}

/**
 * getByRole('button') as Testing Library finds it. Playwright also gives file inputs the button role, and names them
 * after their label, so a regex such as /Neste/ also finds the file input of 'Nested uploader with tags'. Testing
 * Library gives file inputs no role.
 */
export function getButtonByRole(scope: Page | Locator, options: { name: string | RegExp; exact?: boolean }): Locator {
  const page = 'page' in scope ? scope.page() : scope;
  return scope.getByRole('button', options).and(page.locator(':not(input[type=file])'));
}
