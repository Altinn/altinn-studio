import { createSelector } from 'reselect';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../features/form/layout/';
import { IRuntimeState } from '../types';

const layoutSelector = (state: IRuntimeState) => {
  return state.formLayout.layout;
};

const layoutElementSelector = (state: IRuntimeState, props: any) => {
  const layoutElement = state.formLayout.layout.find((element) => element.id === props.id);
  return layoutElement;
};

const layoutFocusSelector = (state: IRuntimeState, props: any) => {
  return state.formLayout.uiConfig.focus && state.formLayout.uiConfig.focus === props.id;
};

const layoutHiddenSelector = (state: IRuntimeState, props: any) => {
  return state.formLayout.uiConfig.hiddenFields.findIndex((id) => id === props.id) > -1;
}

const getLayout = () => {
  return createSelector(
    [layoutSelector],
    (layout: ILayout) => layout,
  );
};

const getLayoutElement = () => {
  return createSelector(
    [layoutElementSelector],
    (layoutElement: ILayoutComponent | ILayoutGroup) => {
      return layoutElement;
    },
  );
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

export const makeGetLayout = getLayout;
export const makeGetLayoutElement = getLayoutElement;
export const makeGetFocus = getFocus;
export const makeGetHidden = getHidden;
