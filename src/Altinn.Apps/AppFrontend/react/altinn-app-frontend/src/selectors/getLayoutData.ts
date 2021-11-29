import { createSelector, ParametricSelector } from 'reselect';
import { IRuntimeState } from '../types';

const selectFocusedLayout = (state: IRuntimeState) =>
  state.formLayout.uiConfig.focus;

const selectHiddenFields = (state: IRuntimeState) =>
  state.formLayout.uiConfig.hiddenFields;

const selectId = (state, props) => props.id;

export const makeGetFocus = (): ParametricSelector<
  IRuntimeState,
  {
    id: string;
  },
  boolean
> =>
  createSelector([selectFocusedLayout, selectId], (focus, id) => focus === id);

export const makeGetHidden = (): ParametricSelector<
  IRuntimeState,
  {
    id: string;
  },
  boolean
> =>
  createSelector(
    [selectHiddenFields, selectId],
    (fields, id) => fields.findIndex((itemId) => itemId === id) > -1,
  );
