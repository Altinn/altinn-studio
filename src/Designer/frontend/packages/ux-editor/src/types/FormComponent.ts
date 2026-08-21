import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResourceBindings, IOption, IDataModelBindingsKeyValueExplicit } from './global';
import type { SimpleComponentType } from './SimpleComponentType';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { BooleanExpression } from '@studio/components';
import type { IGrid } from '@app/layout-contract/generated/common.generated';

export interface FormComponentBase<T extends ComponentType = ComponentType> {
  id: string;
  component?: string;
  type: T;
  name?: string;
  size?: string;
  options?: IOption[];
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  textResourceBindings?: ITextResourceBindings;
  disabled?: boolean;
  hidden?: BooleanExpression;
  grid?: IGrid;
  [id: string]: any;
}

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
    ComponentSpecificConfig<componentType>;
}[T];

export type SelectionComponentType =
  | ComponentType.Checkboxes
  | ComponentType.Dropdown
  | ComponentType.Likert
  | ComponentType.MultipleSelect
  | ComponentType.RadioButtons;
