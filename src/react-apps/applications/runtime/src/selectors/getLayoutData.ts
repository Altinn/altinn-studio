import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import { ILayoutComponent, ILayoutContainer } from '../features/form/layout/types';
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
    (layout: [ILayoutComponent | ILayoutContainer]) => layout,
  );
};

const getLayoutElement = () => {
  return createSelector(
    [layoutElementSelector],
    (layoutElement: ILayoutComponent | ILayoutContainer) => {
      return layoutElement;
    },
  );
};

export const makeGetLayout = getLayout;
export const makeGetLayoutElement = getLayoutElement;
