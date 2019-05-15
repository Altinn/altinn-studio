import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import { IRuntimeState } from '../types';
const isEqual = require('lodash.isequal');

const formDataSelector = (state: IAppState) => {
  return state.formFiller.formData;
};

const formDataForContainerSelector = (state: IRuntimeState, props: any, index?: number) => {
  const selectors = {};
  const simpleBinding = 'simpleBinding';
  if (Object.keys(state.formData.formData).length > 0) {
    Object.keys(state.formData.formData).forEach(
      (key) => {
        if (Object.keys(props.dataModelBindings).indexOf(simpleBinding) > -1) {
          if (state.formData.formData[key] !== props.formData && props.dataModelBindings[simpleBinding] === key) {
            selectors[key] = state.formData.formData[key];
          }
        } else {
          for (const dataModelKey in props.dataModelBindings) {
            if (!dataModelKey) {
              continue;
            }
            if (state.formData.formData[dataModelKey] !== props.formData
              && props.dataModelBindings[dataModelKey] === key) {
              selectors[key] = state.formData.formData[key];
            }
          }
        }
      });
  }
  return selectors;
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
