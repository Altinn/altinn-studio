import { createSelector } from 'reselect';

const formDataSelector = (state: any, providedProps: any) => {
  return state.formFiller.formData[state.formDesigner.layout.components[providedProps.id].dataModelBinding];
};

const getFormData = () => {
  return createSelector(
    [formDataSelector],
    (formData: any) => {
      if (!formData) return '';
      return formData;
    },
  );
};

export const makeGetFormDataSelector = getFormData;
