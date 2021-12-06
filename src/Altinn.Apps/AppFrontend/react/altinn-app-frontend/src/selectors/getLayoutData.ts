import { createSelector, ParametricSelector } from 'reselect';
import { RootState } from 'src/store';

const selectFocusedLayout = (state: RootState) =>
  state.formLayout.uiConfig.focus;

const selectHiddenFields = (state: RootState) =>
  state.formLayout.uiConfig.hiddenFields;

const selectId = (state, props) => props.id;

export const makeGetFocus = (): ParametricSelector<
  RootState,
  {
    id: string;
  },
  boolean
> =>
  createSelector([selectFocusedLayout, selectId], (focus, id) => focus === id);

export const makeGetHidden = (): ParametricSelector<
  RootState,
  {
    id: string;
  },
  boolean
> =>
  createSelector(
    [selectHiddenFields, selectId],
    (fields, id) => fields.findIndex((itemId) => itemId === id) > -1,
  );
