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
  TagTitle = 'tagTitle',
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
  [ComponentType.FileUpload]: [EditSettings.Title, EditSettings.Description, EditSettings.Help],
  [ComponentType.FileUploadWithTag]: [
    EditSettings.Title,
    EditSettings.Description,
    EditSettings.Help,
    EditSettings.TagTitle,
    EditSettings.CodeList,
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
      labelKey='ux_editor.modal_properties_textResourceBindings_title'
      placeholderKey='ux_editor.modal_properties_textResourceBindings_title_add'
    />
  ),
  [EditSettings.ReadOnly]: EditReadOnly,
  [EditSettings.Required]: EditRequired,
  [EditSettings.Description]: ({ component, handleComponentChange }: IGenericEditComponent) => (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey={EditSettings.Description}
      labelKey='ux_editor.modal_properties_textResourceBindings_description'
      placeholderKey='ux_editor.modal_properties_textResourceBindings_description_add'
    />
  ),
  [EditSettings.TagTitle]: ({ component, handleComponentChange }: IGenericEditComponent) => (
    <EditTextResourceBinding
      component={component}
      handleComponentChange={handleComponentChange}
      textKey={EditSettings.TagTitle}
      labelKey='ux_editor.modal_properties_textResourceBindings_tag'
      placeholderKey='ux_editor.modal_properties_textResourceBindings_tag_add'
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
      labelKey='ux_editor.modal_properties_textResourceBindings_help'
      placeholderKey='ux_editor.modal_properties_textResourceBindings_help_add'
    />
  ),
};
