import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
const isEqual = require('lodash.isequal');

const formDataSelector = (state: IAppState) => {
  return state.formFiller.formData;
};

const formDataForContainerSelector = (state: IAppState, props: any, index?: number) => {
  const layout = state.formDesigner.layout;
  const componentsInContainer = Object.keys(layout.components).filter(
    (componentId: string) => {
      return layout.order[props.id].indexOf(componentId) > -1;
    },
  );

  const container = layout.containers[props.id];
  const filteredFormData: any = {};

  for (const componentId of componentsInContainer) {
    const component = layout.components[componentId];
    let formDataKey = component.dataModelBinding;
    if (!formDataKey) {
      continue;
    }
    if (container.repeating && container.dataModelGroup && index != null) {
      formDataKey = formDataKey.replace(container.dataModelGroup, `${container.dataModelGroup}[${index}]`);
    }
    const formData = state.formFiller.formData;
    if (formData[formDataKey]) {
      filteredFormData[component.dataModelBinding] = formData[formDataKey];
    }
  }
  return filteredFormData;
};

const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  isEqual,
);

const unsavedChangesSelector = (state: IAppState) => {
  return state.formFiller.unsavedChanges;
};

const validationErrorsSelector = (state: IAppState) => {
  return state.formFiller.validationErrors;
};

const getFormData = () => {
  return createDeepEqualSelector(
    [formDataForContainerSelector],
    (formData: any) => {
      if (!formData) {
        return [];
      }
      return formData;
    },
  );
};

const getFormDataCount = () => {
  return createSelector(
    [formDataSelector],
    (formData: any) => {
      return Object.keys(formData).length;
    },
  );
};

const getUnsavedChanges = () => {
  return createSelector(
    [unsavedChangesSelector],
    (unsavedChanges: boolean) => {
      return unsavedChanges;
    },
  );
};

const getValidationErrors = () => {
  return createSelector(
    [validationErrorsSelector],
    (validationErrors: any[]) => {
      return validationErrors;
    },
  );
};

export const makeGetFormDataSelector = getFormData;
export const makeGetFormDataCountSelector = getFormDataCount;
export const makeGetUnsavedChangesSelector = getUnsavedChanges;
export const makeGetValidationErrorsSelector = getValidationErrors;
