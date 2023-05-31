import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditCodeList } from './editModal/EditCodeList';
import { EditDataModelBindings } from './editModal/EditDataModelBindings';
import { EditHeaderSize } from './editModal/EditHeaderSize';
import { EditOptions } from './editModal/EditOptions';
import { EditPreselectedIndex } from './editModal/EditPreselectedIndex';
import { EditReadOnly } from './editModal/EditReadOnly';
import { EditRequired } from './editModal/EditRequired';
import { EditAutoComplete } from './editModal/EditAutoComplete';
import { EditTextResourceBinding } from './editModal/EditTextResourceBinding';
import type { FormComponent } from '../../types/FormComponent';

export interface IGenericEditComponent<T extends FormComponent = FormComponent> {
  editFormId?: string;
  component: T;
  handleComponentChange: (component: T) => void;
  layoutName?: string;
}

export enum EditSettings {
  Title = 'title',
  Description = 'description',
  Help = 'help',
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
  EditSettings.Help,
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
  [ComponentType.Header]: [EditSettings.Title, EditSettings.Size],
  [ComponentType.Input]: [...editBoilerPlate, EditSettings.AutoComplete],
  [ComponentType.TextArea]: [...editBoilerPlate, EditSettings.AutoComplete],
  [ComponentType.Datepicker]: [...editBoilerPlate],
  [ComponentType.Paragraph]: [EditSettings.Title],
  [ComponentType.AttachmentList]: [EditSettings.Title],
  [ComponentType.RadioButtons]: [...editBoilerPlate],
  [ComponentType.Checkboxes]: [
    ...editBoilerPlate,
    EditSettings.Options,
    EditSettings.PreselectedIndex,
  ],
  [ComponentType.RadioButtons]: [
    ...editBoilerPlate,
    EditSettings.Options,
    EditSettings.PreselectedIndex,
  ],
  [ComponentType.Dropdown]: [
    ...editBoilerPlate,
    EditSettings.CodeList,
    EditSettings.PreselectedIndex,
    EditSettings.AutoComplete,
  ],
  [ComponentType.AddressComponent]: [EditSettings.Title, EditSettings.Help],
  [ComponentType.FileUploadWithTag]: [
    EditSettings.Title,
    EditSettings.Description,
    EditSettings.Help,
  ],
  [ComponentType.Panel]: [EditSettings.Title],
  [ComponentType.Map]: [EditSettings.ReadOnly],
};

export const configComponents: IConfigComponents = {
  [EditSettings.DataModelBindings]: EditDataModelBindings,
  [EditSettings.Size]: EditHeaderSize,
  [EditSettings.Title]: ({ component, handleComponentChange }: IGenericEditComponent) => (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey={EditSettings.Title}
      labelKey='ux_editor.modal_properties_label'
      placeholderKey='ux_editor.modal_properties_label_add'
    />
  ),
  [EditSettings.ReadOnly]: EditReadOnly,
  [EditSettings.Required]: EditRequired,
  [EditSettings.Description]: ({ component, handleComponentChange }: IGenericEditComponent) => (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey={EditSettings.Description}
      labelKey='ux_editor.modal_properties_description'
      placeholderKey='ux_editor.modal_properties_description_add'
    />
  ),
  [EditSettings.Options]: EditOptions,
  [EditSettings.CodeList]: EditCodeList,
  [EditSettings.PreselectedIndex]: EditPreselectedIndex,
  [EditSettings.AutoComplete]: EditAutoComplete,
  [EditSettings.Help]: ({ component, handleComponentChange }: IGenericEditComponent) => (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey={EditSettings.Help}
      labelKey='ux_editor.modal_properties_helptext'
      placeholderKey='ux_editor.modal_properties_helptext_add'
    />
  ),
};
