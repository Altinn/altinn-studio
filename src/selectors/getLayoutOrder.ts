import { createSelector } from 'reselect';

import type { RootState } from 'src/redux/store';
import type { IPageOrderConfig } from 'src/types';

/**
 * Given the IPageOrderConfig state, this returns the final order for layouts
 */
export function getLayoutOrderFromPageOrderConfig(pageOrderConfig: IPageOrderConfig): string[] | null {
  if (pageOrderConfig.order === null) {
    return null;
  }

  const hiddenSet = new Set(pageOrderConfig.hidden);
  return [...pageOrderConfig.order].filter((layout) => !hiddenSet.has(layout));
}

/**
 * Given the current view and the layout order, this returns the next and previous page
 */
function getNextAndPreviousPageFromState(
  currentView: string,
  layoutOrder: string[],
): { next?: string; previous?: string } {
  const currentViewIndex = layoutOrder?.indexOf(currentView);
  const nextView = currentViewIndex !== -1 ? currentViewIndex + 1 : 0;
  const previousView = currentViewIndex !== -1 ? currentViewIndex - 1 : 0;

  return {
    next: layoutOrder?.[nextView],
    previous: layoutOrder?.[previousView],
  };
}

export const selectPageOrderConfig = (state: RootState) => state.formLayout.uiConfig.pageOrderConfig;
const selectCurrentView = (state: RootState) => state.formLayout.uiConfig.currentView;

export const selectLayoutOrder = createSelector(selectPageOrderConfig, getLayoutOrderFromPageOrderConfig);

export const selectPreviousAndNextPage = createSelector(
  selectCurrentView,
  selectLayoutOrder,
  getNextAndPreviousPageFromState,
);
