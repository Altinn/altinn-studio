import { createSelector } from 'reselect';
import { IRuntimeState } from '../types';

const layoutFocusSelector = (state: IRuntimeState, props: any) => {
  return state.formLayout.uiConfig.focus && state.formLayout.uiConfig.focus === props.id;
};

const layoutHiddenSelector = (state: IRuntimeState, props: any) => {
  return state.formLayout.uiConfig.hiddenFields.findIndex((id) => id === props.id) > -1;
};

const getFocus = () => {
  return createSelector(
    [layoutFocusSelector],
    (focus: boolean) => focus,
  );
};

const getHidden = () => {
  return createSelector(
    [layoutHiddenSelector],
    (hidden: boolean) => hidden,
  );
};

export const makeGetFocus = getFocus;
export const makeGetHidden = getHidden;
