import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ITextResourceBindings, IOption, IDataModelBindingsKeyValueExplicit } from './global';
import type { SimpleComponentType } from './SimpleComponentType';
import type { ComponentConfig } from './ComponentConfig';
import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

export type FormComponentBase<T extends ComponentType = ComponentType> = Pick<
  ComponentBase,
  'id' | 'hidden' | 'grid'
> & {
  component?: string;
  type: T;
  name?: string;
  size?: string;
  options?: IOption[];
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  textResourceBindings?: ITextResourceBindings;
  disabled?: boolean;
  customProperties?: Record<string, unknown>;
};

export type FormImageComponent = FormComponent<ComponentType.Image>;
export type FormCheckboxesComponent = FormComponent<ComponentType.Checkboxes>;
export type FormRadioButtonsComponent = FormComponent<ComponentType.RadioButtons>;
export type FormFileUploaderComponent = FormComponent<ComponentType.FileUpload>;
export type FormFileUploaderWithTagComponent = FormComponent<ComponentType.FileUploadWithTag>;
export type FormButtonComponent = FormComponent<
  ComponentType.Button | ComponentType.NavigationButtons
>;
export type FormAttachmentListComponent = FormComponent<ComponentType.AttachmentList>;

export type FormComponent<T extends SimpleComponentType = SimpleComponentType> = {
  [componentType in ComponentType]: FormComponentBase<componentType> &
    ComponentConfig<componentType>;
}[T];

export type SelectionComponentType =
  | ComponentType.Checkboxes
  | ComponentType.Dropdown
  | ComponentType.Likert
  | ComponentType.MultipleSelect
  | ComponentType.RadioButtons;
