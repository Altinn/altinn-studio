import { createSelector } from 'reselect';

const formDataSelector = (state: IAppState, providedProps: any) => {
  //console.log('formDataSelector, id:', providedProps.id);
  const container = state.formDesigner.layout.containers[providedProps.id];
  const order = state.formDesigner.layout.order[providedProps.id];
  const componentIds = order.filter((id: string) => state.formDesigner.layout.components[id]);
  if (!componentIds) {
    return null;
  }
  const filteredFormData: any = {};
  componentIds.forEach((componentId: string) => {
    const dataModelBinding = state.formDesigner.layout.components[componentId].dataModelBinding;
    const dataModelWithIndex = dataModelBinding && container.repeating
      ? dataModelBinding.replace(container.dataModelGroup, container.dataModelGroup
      + `[${container.index}]`) : dataModelBinding;
    if (state.formFiller.formData[dataModelWithIndex]) {
      filteredFormData[dataModelBinding] = state.formFiller.formData[dataModelWithIndex];
    }
  });
  return filteredFormData;
};

const getFormData = () => {
  //console.log('getFormData');
  return createSelector(
    [formDataSelector],
    (formData: any) => {
      if (!formData) return '';
      return formData;
    },
  );
};

export const makeGetFormDataSelector = getFormData;
