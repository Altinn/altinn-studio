import {
  screen as testingLibraryScreen,
  within as testingLibraryWithin,
} from '@testing-library/react';
import type { queries, BoundFunctions, MatcherFunction } from '@testing-library/react';

export type StudioMatchers = BoundFunctions<typeof queries> & {
  getDetailsBySummary: (summary: string) => HTMLElement;
  getFieldsetByLegend: (legend: string) => HTMLElement;
  getSummaryByText: (summary: string) => HTMLElement;
  queryDetailsBySummary: (summary: string) => HTMLElement | null;
  querySummaryByText: (summary: string) => HTMLElement | null;
};

export const screen: StudioMatchers = extendMatcherObject(testingLibraryScreen);

export function within(element: HTMLElement): StudioMatchers {
  return extendMatcherObject(testingLibraryWithin(element));
}

function extendMatcherObject(
  matcherObject: Screen | ReturnType<typeof testingLibraryWithin>,
): StudioMatchers {
  return {
    ...matcherObject,
    getDetailsBySummary(summary: string): HTMLDetailsElement {
      // See https://github.com/testing-library/dom-testing-library/issues/1252
      const { parentElement } = this.getSummaryByText(summary);
      /* istanbul ignore else */
      if (parentElement instanceof HTMLDetailsElement) return parentElement;
      else throw new Error('Could not find details element.');
    },
    getFieldsetByLegend(legend: string): HTMLElement {
      return this.getByRole('group', {
        name: (accessibleName) => accessibleName.startsWith(legend),
      });
    },
    getSummaryByText(summary: string): HTMLElement {
      return this.getByText(summaryByTextMatcher(summary));
    },
    queryDetailsBySummary(summary: string): HTMLDetailsElement | null {
      const summaryElement = this.querySummaryByText(summary);
      /* istanbul ignore else */
      if (!summaryElement) {
        return null;
      } else {
        const { parentElement } = summaryElement;
        return parentElement instanceof HTMLDetailsElement ? parentElement : null;
      }
    },
    querySummaryByText(summary: string): HTMLElement | null {
      return this.queryByText(summaryByTextMatcher(summary));
    },
  };
}

const summaryByTextMatcher =
  (summary: string): MatcherFunction =>
  (_content, element): boolean =>
    element?.nodeName === 'SUMMARY' && element.textContent?.trim() === summary;
