import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';

export interface IGenericEditComponent<T extends ComponentType = ComponentType> {
  editFormId?: string;
  component: FormItem<T>;
  handleComponentChange: (component: FormItem<T>, mutateOptions?: UpdateFormMutateOptions) => void;
  layoutName?: string;
}

export enum EditSettings {
  DataModelBindings = 'dataModelBindings',
  Size = 'size',
  ReadOnly = 'readonly',
  Required = 'required',
  Options = 'options',
  CodeList = 'codelist',
  PreselectedIndex = 'preselectedIndex',
  AutoComplete = 'autocomplete',
}

export const editBoilerPlate = [
  EditSettings.DataModelBindings,
  EditSettings.ReadOnly,
  EditSettings.Required,
];

export interface IComponentEditConfig {
  [id: string]: EditSettings[];
}

export const componentSpecificEditConfig: IComponentEditConfig = {
  [ComponentType.Header]: [EditSettings.Size],
  [ComponentType.Input]: [...editBoilerPlate, EditSettings.AutoComplete],
  [ComponentType.TextArea]: [...editBoilerPlate, EditSettings.AutoComplete],
  [ComponentType.Datepicker]: [...editBoilerPlate],
  [ComponentType.Checkboxes]: [...editBoilerPlate, EditSettings.PreselectedIndex],
  [ComponentType.RadioButtons]: [...editBoilerPlate, EditSettings.PreselectedIndex],
  [ComponentType.Dropdown]: [
    ...editBoilerPlate,
    EditSettings.PreselectedIndex,
    EditSettings.AutoComplete,
  ],
  [ComponentType.Map]: [...editBoilerPlate],
};
