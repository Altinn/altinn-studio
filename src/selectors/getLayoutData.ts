import { createSelector } from 'reselect';
import type { ParametricSelector } from 'reselect';

import type { RootState } from 'src/redux/store';

const selectFocusedComponent = (state: RootState) => state.formLayout.uiConfig.focus;

const selectId = (_state, props) => props.id;

export const makeGetFocus = (): ParametricSelector<
  RootState,
  {
    id: string;
  },
  boolean
> => createSelector([selectFocusedComponent, selectId], (focus, id) => focus === id);
