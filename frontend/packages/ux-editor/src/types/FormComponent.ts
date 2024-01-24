import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IDataModelBindings, ITextResourceBindings, IOption } from './global';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { FormComponent } from '../components/FormComponent';

export interface FormComponentBase<T extends ComponentType = ComponentType> {
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

export type FormImageComponent = FormComponent<ComponentType.Image>;
export type FormCheckboxesComponent = FormComponent<ComponentType.Checkboxes>;
export type FormRadioButtonsComponent = FormComponent<ComponentType.RadioButtons>;
export type FormFileUploaderComponent = FormComponent<ComponentType.FileUpload>;
export type FormFileUploaderWithTagComponent = FormComponent<ComponentType.FileUploadWithTag>;
export type FormButtonComponent = FormComponent<
  ComponentType.Button | ComponentType.NavigationButtons
>;
export type FormAddressComponent = FormComponent<ComponentType.AddressComponent>;

export type FormComponent<T extends ComponentType = ComponentType> = {
  [componentType in ComponentType]: FormComponentBase<componentType> &
    ComponentSpecificConfig<componentType>;
}[T];
