import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import { IRuntimeState } from '../reducers';
const isEqual = require('lodash.isequal');

const formDataSelector = (state: IAppState) => {
  return state.formFiller.formData;
};

const formDataForContainerSelector = (state: IRuntimeState, props: any, index?: number) => {
  const filteredFormData: any = {};
  for (const dataModelKey in state.formLayout.layout) {
    if (!dataModelKey) {
      continue;
    }
    const formDataKey = props.dataModelBindings[dataModelKey];
    if (!formDataKey) {
      continue;
    }
    const formData = state.formData;
    if (formData[formDataKey]) {
      filteredFormData[props.dataModelBindings[dataModelKey]] = formData[formDataKey];
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
  return state.formFiller.validationResults;
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
    (validationResults: IValidationResults) => {
      return validationResults;
    },
  );
};

export const makeGetFormDataSelector = getFormData;
export const makeGetFormDataCountSelector = getFormDataCount;
export const makeGetUnsavedChangesSelector = getUnsavedChanges;
export const makeGetValidationErrorsSelector = getValidationErrors;
