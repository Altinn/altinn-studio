import { screen } from '@testing-library/react';

export function getFieldsetByLegend(legend: string) {
  return screen.getByRole('group', { name: (acessibleName) => acessibleName.startsWith(legend) });
}

/**
 * Since the summary element does not have a role, we need to traverse up the DOM to get the details element. This is a helper function to do that.
 * https://github.com/testing-library/dom-testing-library/issues/1252
 */
export function getDetailsBySummary(summary: string | RegExp) {
  const elem = screen.queryByText(
    (_content, element) =>
      element?.nodeName === 'SUMMARY' && element.textContent?.trim() === summary,
  );
  return elem?.parentElement instanceof HTMLDetailsElement ? elem.parentElement : null;
}
