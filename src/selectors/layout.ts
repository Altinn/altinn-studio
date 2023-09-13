import { createSelector } from 'reselect';

export const layoutsSelector = createSelector(
  (state) => state.formLayout.layouts,
  (layouts) => Object.keys(layouts || {}),
);
