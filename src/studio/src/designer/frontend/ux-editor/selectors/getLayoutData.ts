/* eslint-disable no-undef */
import { createSelector, ParametricSelector } from 'reselect';

const layoutOrderSelector = (state: IAppState) => {
  return state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.order;
};

const layoutContainerSelector = (state: IAppState) => {
  return state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.containers;
};

const layoutComponentelector = (state: IAppState) => {
  return state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.components;
};

const activeFormContainerSelector = (state: IAppState, props: any) => {
  return state.formDesigner.layout.activeContainer === props.id;
};

const layoutContainerOrderSelector = (state: IAppState, containerId: string) => {
  return state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.order[containerId];
};

const allLayoutContainerSelector = (state: IAppState) => {
  const allContainers: IFormDesignerContainers = {};
  Object.keys(state.formDesigner.layout.layouts).forEach((key: string) => {
    Object.assign(allContainers, state.formDesigner.layout.layouts[key].containers);
  });
  return allContainers;
};

const allLayoutComponentSelector = (state: IAppState) => {
  const allComponents: IFormDesignerComponents = {};
  Object.keys(state.formDesigner.layout.layouts).forEach((key: string) => {
    Object.assign(allComponents, state.formDesigner.layout.layouts[key].components);
  });
  return allComponents;
};

const fullOrderSelector = (state: IAppState) => {
  const fullOrder: IFormLayoutOrder = {};
  Object.keys(state.formDesigner.layout.layouts).forEach((key: string) => {
    Object.assign(fullOrder, state.formDesigner.layout.layouts[key].order);
  });
  return fullOrder;
};

const getLayoutOrder = () => {
  return createSelector(
    [layoutOrderSelector],
    (order: any) => {
      return order;
    },
  );
};

const getLayoutContainers = () => {
  return createSelector(
    [layoutContainerSelector],
    (containers: any) => {
      return containers;
    },
  );
};

const getLayoutComponents = () => {
  return createSelector(
    [layoutComponentelector],
    (components: any) => {
      return components;
    },
  );
};

const getAllLayoutComponents = () => {
  return createSelector(
    [allLayoutComponentSelector],
    (components: any) => {
      return components;
    },
  );
};

const getAllLayoutContainers = () => {
  return createSelector(
    [allLayoutContainerSelector],
    (containers: any) => {
      return containers;
    },
  );
};

const getFullOrder = () => {
  return createSelector(
    [fullOrderSelector],
    (order: any) => {
      return order;
    },
  );
};

export const makeGetLayoutContainerOrder = (): ParametricSelector<
  IAppState,
  string,
  string[]
> =>
  createSelector(
    [layoutContainerOrderSelector],
    (order: string[]) => order,
  );

export const makeGetActiveFormContainer = (): ParametricSelector<
  IAppState,
  {
    id: string;
  },
  boolean
> =>
  createSelector(
    [activeFormContainerSelector],
    (isActive) => {
      return isActive;
    },
  );
export const makeGetLayoutOrderSelector = getLayoutOrder;
export const makeGetLayoutContainersSelector = getLayoutContainers;
export const makeGetLayoutComponentsSelector = getLayoutComponents;
export const makeGetAllLayoutComponents = getAllLayoutComponents;
export const makeGetALlLayoutContainers = getAllLayoutContainers;
export const makeGetFullOrder = getFullOrder;
