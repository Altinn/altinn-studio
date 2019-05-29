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

export const makeGetLayout = getLayout;
export const makeGetLayoutElement = getLayoutElement;
