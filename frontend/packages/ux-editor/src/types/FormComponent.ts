import { FormItemType } from 'app-shared/types/FormItemType';
import { IDataModelBindings, ITextResourceBindings, IOption } from './global';

export interface FormComponentBase<T extends FormItemType = FormItemType> {
  id: string;
  component?: string;
  itemType: 'COMPONENT';
  type: T;
  name?: string;
  size?: string;
  options?: IOption[];
  dataModelBindings: IDataModelBindings;
  textResourceBindings?: ITextResourceBindings;
  customType?: string;
  codeListId?: string;
  triggerValidation?: boolean;
  handleUpdateElement?: (component: FormComponent) => void;
  handleDeleteElement?: () => void;
  handleUpdateFormData?: (formData: any) => void;
  handleUpdateDataModel?: (dataModelBinding: string) => void;
  disabled?: boolean;
  required?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  [id: string]: any;
}

interface FormOptionsComponentBase<T extends FormItemType> extends FormComponentBase<T> {
  options: IOption[];
  preselectedOptionIndex?: number;
  optionsId: string;
}

export interface FormHeaderComponent extends FormComponentBase<FormItemType.Header> {
  size: string; // Todo: We need to distinguish between size and level
}

export type FormParagraphComponent = FormComponentBase<FormItemType.Paragraph>;

export interface FormInputComponent extends FormComponentBase<FormItemType.Input> {
  disabled?: boolean;
}

export interface FormImageComponent extends FormComponentBase<FormItemType.Image> {
  image?: {
    src?: {
      [lang: string]: string;
    };
    align?: string | null;
    width?: string;
  };
}

export interface FormDatepickerComponent extends FormComponentBase<FormItemType.Datepicker> {
  timeStamp: boolean;
}

export interface FormDropdownComponent extends FormComponentBase<FormItemType.Dropdown> {
  optionsId: string;
}

export type FormCheckboxesComponent = FormOptionsComponentBase<FormItemType.Checkboxes>;
export type FormRadioButtonsComponent = FormOptionsComponentBase<FormItemType.RadioButtons>;
export type FormTextareaComponent = FormComponentBase<FormItemType.TextArea>;

export interface FormFileUploaderComponent extends FormComponentBase<FormItemType.FileUpload> {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
}

export interface FormFileUploaderWithTagComponent extends FormComponentBase<FormItemType.FileUploadWithTag> {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
  optionsId: string;
}

export interface FormButtonComponent extends FormComponentBase<FormItemType.Button | FormItemType.NavigationButtons> {
  onClickAction: () => void;
}

export interface FormAddressComponent extends FormComponentBase<FormItemType.AddressComponent> {
  simplified: boolean;
}

export type FormGroupComponent = FormComponentBase<FormItemType.Group>;
export type FormNavigationBarComponent = FormComponentBase<FormItemType.NavigationBar>;
export type FormAttachmentListComponent = FormComponentBase<FormItemType.AttachmentList>;

export interface FormThirdPartyComponent extends FormComponentBase<FormItemType.ThirdParty> {
  tagName: string;
  framework: string;
  [id: string]: any;
}

export interface FormPanelComponent extends FormComponentBase<FormItemType.Panel> {
  variant: {
    title: string;
    description: string;
    type: string;
    enum: 'info' | 'warning' | 'success';
    default: 'info';
  };
  showIcon: {
    title: string;
    description: string;
    type: boolean;
    default: true;
  };
}

export interface FormMapComponent extends FormComponentBase<FormItemType.Map> {
  centerLocation: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  layers?: {
    url: string;
    attribution?: string;
    subdomains?: string[];
  }[];
}

export type FormComponent<T extends FormItemType = FormItemType> = {
  [FormItemType.AddressComponent]: FormAddressComponent;
  [FormItemType.AttachmentList]: FormAttachmentListComponent;
  [FormItemType.Button]: FormButtonComponent;
  [FormItemType.Checkboxes]: FormCheckboxesComponent;
  [FormItemType.Datepicker]: FormDatepickerComponent;
  [FormItemType.Dropdown]: FormDropdownComponent;
  [FormItemType.FileUploadWithTag]: FormFileUploaderWithTagComponent;
  [FormItemType.FileUpload]: FormFileUploaderComponent;
  [FormItemType.Group]: FormGroupComponent;
  [FormItemType.Header]: FormHeaderComponent;
  [FormItemType.Image]: FormImageComponent;
  [FormItemType.Input]: FormInputComponent;
  [FormItemType.Map]: FormMapComponent;
  [FormItemType.NavigationBar]: FormNavigationBarComponent;
  [FormItemType.NavigationButtons]: FormButtonComponent;
  [FormItemType.Panel]: FormPanelComponent;
  [FormItemType.Paragraph]: FormParagraphComponent;
  [FormItemType.RadioButtons]: FormRadioButtonsComponent;
  [FormItemType.TextArea]: FormTextareaComponent;
  [FormItemType.ThirdParty]: FormThirdPartyComponent;
}[T];
