import {
  AppStateSelector,
  FormLayoutsSelector,
  IFormDesignerContainers,
  IInternalLayout
} from '../types/global';

export const selectedLayoutNameSelector: AppStateSelector<string> =
  (state) => state.formDesigner.layout.selectedLayout;

export const selectedLayoutSelector: FormLayoutsSelector<IInternalLayout> =
  (state, formLayoutsData) => formLayoutsData?.[selectedLayoutNameSelector(state)] || {
    containers: {},
    components: {},
    order: {},
  };

interface SelectedLayoutWithName {
  layout: IInternalLayout;
  layoutName: string;
}
export const selectedLayoutWithNameSelector: FormLayoutsSelector<SelectedLayoutWithName> =
  (state, formLayoutsData) => ({
    layout: selectedLayoutSelector(state, formLayoutsData),
    layoutName: selectedLayoutNameSelector(state),
  });

export const allLayoutContainersSelector: FormLayoutsSelector<IFormDesignerContainers> =
  (state, formLayoutsData) => Object
    .values(formLayoutsData)
    .reduce((acc, layout) => ({ ...acc, ...layout.containers }), {});

export const allLayoutComponentsSelector: FormLayoutsSelector<IFormDesignerContainers> =
  (state, formLayoutsData) => Object
    .values(formLayoutsData)
    .reduce((acc, layout) => ({ ...acc, ...layout.components }), {});

export const fullLayoutOrderSelector: FormLayoutsSelector<IFormDesignerContainers> =
  (state, formLayoutsData) => Object
    .values(formLayoutsData)
    .reduce((acc, layout) => ({ ...acc, ...layout.order }), {});
