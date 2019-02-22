import { createSelector } from 'reselect';

const layoutOrderSelector = (state: IAppState) => {
  return state.formDesigner.layout.order;
};

const layoutContainerSelector = (state: IAppState) => {
  return state.formDesigner.layout.containers;
};

const layoutComponentelector = (state: IAppState) => {
  return state.formDesigner.layout.components;
};

const activeFormContainerSelector = (state: IAppState, props: any) => {
  return state.formDesigner.layout.activeContainer === props.id;
};

const layoutContainerOrderSelector = (state: IAppState, containerId: string) => {
  return state.formDesigner.layout.order[containerId];
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

const getActiveFormContainer = () => {
  return createSelector(
    [activeFormContainerSelector],
    (isActive) => {
      return isActive;
    },
  );
};

const getLayoutContainerOrder = () => {
  return createSelector(
    [layoutContainerOrderSelector],
    (order: any) => order,
  );
};

export const makeGetLayoutOrderSelector = getLayoutOrder;
export const makeGetLayoutContainersSelector = getLayoutContainers;
export const makeGetLayoutComponentsSelector = getLayoutComponents;
export const makeGetActiveFormContainer = getActiveFormContainer;
export const makeGetLayoutContainerOrder = getLayoutContainerOrder;
