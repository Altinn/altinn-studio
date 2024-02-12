import { ComponentType } from 'app-shared/types/ComponentType';
import { EditCodeList } from './editModal/EditCodeList';
import { EditHeaderSize } from './editModal/EditHeaderSize';
import { EditPreselectedIndex } from './editModal/EditPreselectedIndex';
import { EditReadOnly } from './editModal/EditReadOnly';
import { EditRequired } from './editModal/EditRequired';
import { EditAutoComplete } from './editModal/EditAutoComplete';
import type { FormItem } from '../../types/FormItem';

export interface IGenericEditComponent<T extends ComponentType = ComponentType> {
  editFormId?: string;
  component: FormItem<T>;
  handleComponentChange: (component: FormItem<T>) => void;
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

interface IConfigComponents {
  [id: string]: ({ component, handleComponentChange }: IGenericEditComponent) => JSX.Element;
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

export const configComponents: IConfigComponents = {
  [EditSettings.Size]: EditHeaderSize,
  [EditSettings.ReadOnly]: EditReadOnly,
  [EditSettings.Required]: EditRequired,
  [EditSettings.CodeList]: EditCodeList,
  [EditSettings.PreselectedIndex]: EditPreselectedIndex,
  [EditSettings.AutoComplete]: EditAutoComplete,
};
