import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResourceBindings, IOption, IDataModelBindingsKeyValueExplicit } from './global';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { SimpleComponentType } from './SimpleComponentType';
import type { GridSizes } from '../components/config/editModal/EditGrid/types/GridSizes';
import type { BooleanExpression } from '@studio/components-legacy';

export interface FormComponentBase<T extends ComponentType = ComponentType> {
  id: string;
  component?: string;
  itemType: 'COMPONENT';
  type: T;
  name?: string;
  size?: string;
  options?: IOption[];
  pageIndex?: number;
  dataModelBindings?: IDataModelBindingsKeyValueExplicit;
  textResourceBindings?: ITextResourceBindings;
  customType?: string;
  codeListId?: string;
  triggerValidation?: boolean;
  handleUpdateElement?: (component: FormComponent) => void;
  handleDeleteElement?: () => void;
  handleUpdateFormData?: (formData: any) => void;
  handleUpdateDataModel?: (dataModelBinding: string) => void;
  disabled?: boolean;
  hidden?: BooleanExpression;
  grid?: GridSizes;
  [id: string]: any;
  propertyPath?: string;
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
