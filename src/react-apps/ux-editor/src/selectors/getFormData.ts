import { createSelector } from 'reselect';

const dataModelGroupSelector = (state: IAppState, providedProps: any) => {
  const container = state.formDesigner.layout.containers[providedProps.id];
  return `${container.dataModelGroup}[${container.index}]`;
};

const componentIdInContainerSelector = (state: IAppState, providedProps: any) => {
  return state.formDesigner.layout.order[providedProps.id].filter(
    (id: string) => state.formDesigner.layout.components[id]);
};

const formDataSelector = (state: IAppState, providedProps: any) => {
  return state.formFiller.formData;
};

const getFormData = () => {
  return createSelector(
    [dataModelGroupSelector, componentIdInContainerSelector, formDataSelector],
    (dataModelGroup: string, componentIds: string[], formData: any) => {
      if (!formData) return '';
      const filteredFormData: any = {};
      const dataModelGroupNoIndex = dataModelGroup.indexOf('[') > -1 ? 
        dataModelGroup.substring(0, dataModelGroup.indexOf('[')) : dataModelGroup;
      Object.keys(formData).forEach((key: string) => {
        if (key.startsWith(dataModelGroup)) {
          const keyNoIndex = key.replace(dataModelGroup, dataModelGroupNoIndex);
          filteredFormData[keyNoIndex] = formData[key];
        }
      });

      return filteredFormData;
    },
  );
};

export const makeGetFormDataSelector = getFormData;
