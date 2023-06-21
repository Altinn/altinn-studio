import {
  AppStateSelector,
  FormLayoutsSelector, IFormDesignerComponents,
  IFormDesignerContainers, IFormLayoutOrder,
  IInternalLayout
} from '../types/global';
import { createEmptyLayout } from '../utils/formLayoutUtils';

export const selectedLayoutNameSelector: AppStateSelector<string> =
  (state) => state.formDesigner.layout.selectedLayout;

export const selectedLayoutSetSelector: AppStateSelector<string> =
  (state) => state.formDesigner.layout.selectedLayoutSet;

export const selectedLayoutSelector: FormLayoutsSelector<IInternalLayout> =
  (state, formLayoutsData) =>
    formLayoutsData?.[selectedLayoutNameSelector(state)] || createEmptyLayout();

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

export const allLayoutComponentsSelector: FormLayoutsSelector<IFormDesignerComponents> =
  (state, formLayoutsData) => Object
    .values(formLayoutsData)
    .reduce((acc, layout) => ({ ...acc, ...layout.components }), {});

export const fullLayoutOrderSelector: FormLayoutsSelector<IFormLayoutOrder> =
  (state, formLayoutsData) => Object
    .values(formLayoutsData)
    .reduce((acc, layout) => ({ ...acc, ...layout.order }), {});
