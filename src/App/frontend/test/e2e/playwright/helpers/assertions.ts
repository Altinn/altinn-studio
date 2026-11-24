import { expect as baseExpect } from '@playwright/test';
import type { Locator } from '@playwright/test';

import { escapeRegex } from 'test/e2e/playwright/helpers/actions';

/**
 * Playwright's own toBeInViewport() passes when any part of the element intersects the viewport. The Cypress
 * `inViewport` assertion (test/e2e/support/chai-extensions.ts) requires the whole element to be inside it, so this
 * matcher checks the same rectangle against the same window size. As in Cypress, the first matching element counts.
 */
export const expect = baseExpect.extend({
  async toBeEntirelyInViewport(locator: Locator, options?: { timeout?: number }) {
    const assertionName = 'toBeEntirelyInViewport';
    let actual: boolean | undefined;
    let error: unknown;
    try {
      await baseExpect
        .poll(
          async () => {
            actual = await locator.evaluateAll((elements) => {
              const element = elements[0];
              if (!element) {
                return undefined;
              }
              // jQuery's $(window).height() and .width(), as used by the Cypress assertion
              const height = document.documentElement.clientHeight;
              const width = document.documentElement.clientWidth;
              const rect = element.getBoundingClientRect();
              return (
                rect.top > 0 && rect.top < height && rect.right <= width && rect.left >= 0 && rect.bottom <= height
              );
            });
            return actual;
          },
          { timeout: options?.timeout ?? this.timeout },
        )
        .toBe(!this.isNot);
    } catch (e) {
      error = e;
    }

    const pass = actual === true;
    return {
      name: assertionName,
      pass,
      expected: !this.isNot,
      actual,
      message: () => {
        const hint = this.utils.matcherHint(assertionName, undefined, undefined, { isNot: this.isNot });
        const problem =
          actual === undefined
            ? 'Element not found'
            : `Expected the element ${this.isNot ? 'not ' : ''}to be entirely inside the viewport`;
        const cause = error ? `\n\n${String(error).split('\n')[0]}` : '';
        return `${hint}\n\nLocator: ${locator}\n${problem}${cause}`;
      },
    };
  },
});

/**
 * Cypress requires an element to exist before a negated assertion such as `not.contain.text` can pass, while
 * Playwright's negated matchers also pass when nothing matches. Use this before such assertions.
 */
export async function expectToExist(locator: Locator) {
  await expect(locator.first()).toBeAttached();
}

/**
 * For toHaveText(): Cypress' `have.text` compares the exact text content, while toHaveText() with a string collapses
 * whitespace first. Playwright matches a regex against the text as it is.
 */
export function exactText(text: string): RegExp {
  return new RegExp(`^${escapeRegex(text)}$`);
}
