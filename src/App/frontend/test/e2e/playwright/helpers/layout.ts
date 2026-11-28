import type { ILayoutFile } from '@app/layout-contract/generated/common.generated';
import type { Page } from '@playwright/test';

import { expect } from 'test/e2e/playwright/helpers/assertions';
import { intercept, modifyJsonResponse } from 'test/e2e/playwright/helpers/network';
import type { Interception } from 'test/e2e/playwright/helpers/network';

import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';

/**
 * Changes the layouts in the bootstrap-form response for a task, like cy.interceptLayout(). Lets a test adjust the
 * layout of the app it tests, for example to mark components as required. Call it before the task loads. The mutators
 * run in the test, so they can use variables from it.
 */
export async function interceptLayout(
  page: Page,
  taskName: string,
  mutator?: (component: CompExternal) => void,
  wholeLayoutMutator?: (layoutSet: ILayoutCollection) => void,
  { times = 1 }: { times?: number } = {},
): Promise<Interception> {
  return intercept(
    page,
    { method: 'GET', url: `**/bootstrap-form/${taskName}*`, times },
    modifyJsonResponse<{ layouts: ILayoutCollection }>((response) => {
      const set = response.layouts;
      if (mutator) {
        for (const layout of Object.values(set)) {
          (layout as ILayoutFile).data.layout.map(mutator);
        }
      }
      if (wholeLayoutMutator) {
        wholeLayoutMutator(set);
      }
    }),
  );
}

type ComponentMutator = (component: CompExternal) => void;
type LayoutsMutator = (layouts: ILayouts) => void;

/**
 * Changes the layouts of the form that is shown, the way Studio and the layout inspector in the developer tools do,
 * like cy.changeLayout().
 *
 * The mutators run in the browser, so they cannot use variables from the test: Playwright sends their source code to
 * the page. Keep them self-contained, with only literal values.
 */
export async function changeLayout(page: Page, mutator?: ComponentMutator, allLayoutsMutator?: LayoutsMutator) {
  await page.evaluate(
    ([mutatorSource, allLayoutsMutatorSource]) => {
      const toFunction = (source: string | undefined) => (source ? (0, eval)(`(${source})`) : undefined);
      const mutator = toFunction(mutatorSource) as ComponentMutator | undefined;
      const allLayoutsMutator = toFunction(allLayoutsMutatorSource) as LayoutsMutator | undefined;

      // LayoutRevisionBoundary remounts the form. Remember the presentations shown now, so that the test can wait for
      // them to detach before it continues, and cannot type into a form that is about to unmount.
      (window as unknown as { __previousPresentations: Element[] }).__previousPresentations = Array.from(
        document.querySelectorAll('[data-testid="presentation"]'),
      );

      window.changeLayouts((current) => {
        const nextLayouts = structuredClone(current);
        const layouts = Object.fromEntries(
          Object.entries(nextLayouts).map(([pageKey, page]) => [pageKey, page?.data?.layout ?? []]),
        ) as ILayouts;

        if (mutator) {
          for (const page of Object.values(layouts)) {
            for (const component of page || []) {
              mutator(component);
            }
          }
        }
        if (allLayoutsMutator) {
          allLayoutsMutator(layouts);
        }
        for (const [pageKey, layout] of Object.entries(layouts)) {
          if (nextLayouts[pageKey]?.data) {
            nextLayouts[pageKey].data.layout = layout!;
          }
        }

        return nextLayouts;
      });
    },
    [mutator?.toString(), allLayoutsMutator?.toString()] as const,
  );

  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __previousPresentations: Element[] }).__previousPresentations.some(
          (presentation) => !presentation.isConnected,
        ),
      ),
    )
    .toBe(true);

  await expect(page.getByTestId('presentation')).toBeAttached();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
}
