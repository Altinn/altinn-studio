import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { IDataModelBindings, ITextResourceBindings, IOption } from './global';
import type { ComponentSpecificConfigV3 } from 'app-shared/types/ComponentSpecificConfigV3';

export interface FormComponentBase<T extends ComponentTypeV3 = ComponentTypeV3> {
  id: string;
  component?: string;
  itemType: 'COMPONENT';
  type: T;
  name?: string;
  size?: string;
  options?: IOption[];
  pageIndex?: number;
  dataModelBindings?: IDataModelBindings;
  textResourceBindings?: ITextResourceBindings;
  customType?: string;
  codeListId?: string;
  triggerValidation?: boolean;
  handleUpdateElement?: (component: FormComponent) => void;
  handleDeleteElement?: () => void;
  handleUpdateFormData?: (formData: any) => void;
  handleUpdateDataModel?: (dataModelBinding: string) => void;
  disabled?: boolean;
  required?: boolean | any;
  hidden?: boolean | any;
  readOnly?: boolean | any;
  [id: string]: any;
  propertyPath?: string;
}

export type FormImageComponent = FormComponent<ComponentTypeV3.Image>;
export type FormCheckboxesComponent = FormComponent<ComponentTypeV3.Checkboxes>;
export type FormRadioButtonsComponent = FormComponent<ComponentTypeV3.RadioButtons>;
export type FormFileUploaderComponent = FormComponent<ComponentTypeV3.FileUpload>;
export type FormFileUploaderWithTagComponent = FormComponent<ComponentTypeV3.FileUploadWithTag>;
export type FormButtonComponent = FormComponent<
  ComponentTypeV3.Button | ComponentTypeV3.NavigationButtons
>;
export type FormAddressComponent = FormComponent<ComponentTypeV3.AddressComponent>;

export type FormComponent<T extends ComponentTypeV3 = ComponentTypeV3> = {
  [componentType in ComponentTypeV3]: FormComponentBase<componentType> &
    ComponentSpecificConfigV3<componentType>;
}[T];
