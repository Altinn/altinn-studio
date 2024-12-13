import React from 'react';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { EditCodeList } from './editModal/EditCodeList';
import { EditDataModelBindings } from './editModal/EditDataModelBindings';
import { EditHeaderSize } from './editModal/EditHeaderSize';
import { EditOptions } from './editModal/EditOptions';
import { EditPreselectedIndex } from './editModal/EditPreselectedIndex';
import { EditReadOnly } from './editModal/EditReadOnly';
import { EditRequired } from './editModal/EditRequired';
import { EditAutocomplete } from './editModal/EditAutocomplete';
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
  [ComponentTypeV3.Header]: [EditSettings.Title, EditSettings.Size],
  [ComponentTypeV3.Input]: [...editBoilerPlate, EditSettings.AutoComplete],
  [ComponentTypeV3.TextArea]: [...editBoilerPlate, EditSettings.AutoComplete],
  [ComponentTypeV3.Datepicker]: [...editBoilerPlate],
  [ComponentTypeV3.Paragraph]: [EditSettings.Title],
  [ComponentTypeV3.AttachmentList]: [EditSettings.Title],
  [ComponentTypeV3.Checkboxes]: [
    ...editBoilerPlate,
    EditSettings.Options,
    EditSettings.PreselectedIndex,
  ],
  [ComponentTypeV3.RadioButtons]: [
    ...editBoilerPlate,
    EditSettings.Options,
    EditSettings.PreselectedIndex,
  ],
  [ComponentTypeV3.Dropdown]: [
    ...editBoilerPlate,
    EditSettings.CodeList,
    EditSettings.PreselectedIndex,
    EditSettings.AutoComplete,
  ],
  [ComponentTypeV3.AddressComponent]: [EditSettings.Title, EditSettings.Help],
  [ComponentTypeV3.FileUpload]: [EditSettings.Title, EditSettings.Description, EditSettings.Help],
  [ComponentTypeV3.FileUploadWithTag]: [
    EditSettings.Title,
    EditSettings.Description,
    EditSettings.Help,
    EditSettings.TagTitle,
    EditSettings.CodeList,
  ],
  [ComponentTypeV3.Panel]: [EditSettings.Title],
  [ComponentTypeV3.Map]: [...editBoilerPlate],
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
      labelKey='ux_editor.modal_properties_textResourceBindings_tagTitle'
      placeholderKey='ux_editor.modal_properties_textResourceBindings_tagTitle_add'
    />
  ),
  [EditSettings.Options]: EditOptions,
  [EditSettings.CodeList]: EditCodeList,
  [EditSettings.PreselectedIndex]: EditPreselectedIndex,
  [EditSettings.AutoComplete]: EditAutocomplete,
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
