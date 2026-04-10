import { screen } from '@testing-library/react';
import type { MatcherFunction } from '@testing-library/react';

export function getFieldsetByLegend(legend: string) {
  return screen.getByRole('group', { name: (acessibleName) => acessibleName.startsWith(legend) });
}

/**
 * Since the summary element does not have a role, we need to traverse up the DOM to get the details element. This is a helper function to do that.
 * https://github.com/testing-library/dom-testing-library/issues/1252
 */
export function getDetailsBySummary(summary: string): HTMLDetailsElement {
  const { parentElement } = getSummaryByText(summary);
  /* istanbul ignore else */
  if (parentElement instanceof HTMLDetailsElement) return parentElement;
  else throw new Error('Could not find details element.');
}

export function getSummaryByText(summary: string): HTMLElement {
  return screen.getByText(summaryByTextMatcher(summary));
}

export function querySummaryByText(summary: string): HTMLElement | null {
  return screen.queryByText(summaryByTextMatcher(summary));
}

const summaryByTextMatcher =
  (summary: string): MatcherFunction =>
  (_content, element): boolean =>
    element?.nodeName === 'SUMMARY' && element.textContent?.trim() === summary;
