import { createSelector, createSelectorCreator, defaultMemoize } from 'reselect';
import { IRuntimeState } from '../types';
// tslint:disable-next-line:no-var-requires
const isEqual = require('lodash.isequal');

const formDataSelector = (state: IRuntimeState) => {
  return state.formData.formData;
};

const formDataForContainerSelector = (state: IRuntimeState, props: any, index?: number) => {
  const selectors: any = {};
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
            if (state.formData.formData[key]
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

const unsavedChangesSelector = (state: IRuntimeState) => {
  return state.formData.unsavedChanges;
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

export const makeGetFormDataSelector = getFormData;
export const makeGetFormDataCountSelector = getFormDataCount;
export const makeGetUnsavedChangesSelector = getUnsavedChanges;
