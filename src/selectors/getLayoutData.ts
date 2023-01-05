import { createSelector } from 'reselect';
import type { ParametricSelector } from 'reselect';

import type { RootState } from 'src/store';

const selectFocusedComponent = (state: RootState) => state.formLayout.uiConfig.focus;

const selectHiddenFields = (state: RootState) => state.formLayout.uiConfig.hiddenFields;

const selectId = (_state, props) => props.id;

export const makeGetFocus = (): ParametricSelector<
  RootState,
  {
    id: string;
  },
  boolean
> => createSelector([selectFocusedComponent, selectId], (focus, id) => focus === id);

export const makeGetHidden = (): ParametricSelector<
  RootState,
  {
    id: string;
  },
  boolean
> => createSelector([selectHiddenFields, selectId], (fields, id) => fields.findIndex((itemId) => itemId === id) > -1);
