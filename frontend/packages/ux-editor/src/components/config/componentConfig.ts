import { FormItemType } from 'app-shared/types/FormItemType';
import { EditCodeList } from './editModal/EditCodeList';
import { EditDataModelBindings } from './editModal/EditDataModelBindings';
import { EditDescription } from './editModal/EditDescription';
import { EditHeaderSize } from './editModal/EditHeaderSize';
import { EditOptions } from './editModal/EditOptions';
import { EditPreselectedIndex } from './editModal/EditPreselectedIndex';
import { EditReadOnly } from './editModal/EditReadOnly';
import { EditRequired } from './editModal/EditRequired';
import { EditTitle } from './editModal/EditTitle';
import { EditAutoComplete } from './editModal/EditAutoComplete';
import type { FormComponent } from '../../types/FormComponent';

export interface IGenericEditComponent<T extends FormComponent = FormComponent> {
  component: T;
  handleComponentChange: (component: T) => void;
  layoutName?: string;
}

export enum EditSettings {
  Title = 'title',
  Description = 'description',
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
  EditSettings.Title,
  EditSettings.Description,
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
  [FormItemType.Header]: [EditSettings.Title, EditSettings.Size],
  [FormItemType.Input]: [...editBoilerPlate, EditSettings.AutoComplete],
  [FormItemType.TextArea]: [...editBoilerPlate, EditSettings.AutoComplete],
  [FormItemType.Datepicker]: [...editBoilerPlate],
  [FormItemType.Paragraph]: [EditSettings.Title],
  [FormItemType.AttachmentList]: [EditSettings.Title],
  [FormItemType.RadioButtons]: [...editBoilerPlate],
  [FormItemType.Checkboxes]: [
    ...editBoilerPlate,
    EditSettings.Options,
    EditSettings.PreselectedIndex,
  ],
  [FormItemType.RadioButtons]: [
    ...editBoilerPlate,
    EditSettings.Options,
    EditSettings.PreselectedIndex,
  ],
  [FormItemType.Dropdown]: [
    ...editBoilerPlate,
    EditSettings.CodeList,
    EditSettings.PreselectedIndex,
    EditSettings.AutoComplete,
  ],
  [FormItemType.AddressComponent]: [EditSettings.Title],
  [FormItemType.FileUploadWithTag]: [EditSettings.Title, EditSettings.Description],
  [FormItemType.Panel]: [EditSettings.Title],
  [FormItemType.Map]: [EditSettings.ReadOnly],
};

export const configComponents: IConfigComponents = {
  [EditSettings.DataModelBindings]: EditDataModelBindings,
  [EditSettings.Size]: EditHeaderSize,
  [EditSettings.Title]: EditTitle,
  [EditSettings.ReadOnly]: EditReadOnly,
  [EditSettings.Required]: EditRequired,
  [EditSettings.Description]: EditDescription,
  [EditSettings.Options]: EditOptions,
  [EditSettings.CodeList]: EditCodeList,
  [EditSettings.PreselectedIndex]: EditPreselectedIndex,
  [EditSettings.AutoComplete]: EditAutoComplete,
};
