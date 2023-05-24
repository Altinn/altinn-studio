import { ComponentType } from '../components';
import { IDataModelBindings, ITextResourceBindings, IOption } from './global';

export interface FormComponentBase<T extends ComponentType = ComponentType> {
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

interface FormOptionsComponentBase<T extends ComponentType> extends FormComponentBase<T> {
  options: IOption[];
  preselectedOptionIndex?: number;
  optionsId: string;
}

export interface FormHeaderComponent extends FormComponentBase<ComponentType.Header> {
  size: string; // Todo: We need to distinguish between size and level
}

export type FormParagraphComponent = FormComponentBase<ComponentType.Paragraph>;

export interface FormInputComponent extends FormComponentBase<ComponentType.Input> {
  disabled?: boolean;
}

export interface FormImageComponent extends FormComponentBase<ComponentType.Image> {
  image?: {
    src?: {
      [lang: string]: string;
    };
    align?: string | null;
    width?: string;
  };
}

export interface FormDatepickerComponent extends FormComponentBase<ComponentType.Datepicker> {
  timeStamp: boolean;
}

export interface FormDropdownComponent extends FormComponentBase<ComponentType.Dropdown> {
  optionsId: string;
}

export type FormCheckboxesComponent = FormOptionsComponentBase<ComponentType.Checkboxes>;
export type FormRadioButtonsComponent = FormOptionsComponentBase<ComponentType.RadioButtons>;
export type FormTextareaComponent = FormComponentBase<ComponentType.TextArea>;

export interface FormFileUploaderComponent extends FormComponentBase<ComponentType.FileUpload> {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
}

export interface FormFileUploaderWithTagComponent extends FormComponentBase<ComponentType.FileUploadWithTag> {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
  optionsId: string;
}

export interface FormButtonComponent extends FormComponentBase<ComponentType.Button | ComponentType.NavigationButtons> {
  onClickAction: () => void;
}

export interface FormAddressComponent extends FormComponentBase<ComponentType.AddressComponent> {
  simplified: boolean;
}

export type FormGroupComponent = FormComponentBase<ComponentType.Group>;
export type FormNavigationBarComponent = FormComponentBase<ComponentType.NavigationBar>;
export type FormAttachmentListComponent = FormComponentBase<ComponentType.AttachmentList>;

export interface FormThirdPartyComponent extends FormComponentBase<ComponentType.ThirdParty> {
  tagName: string;
  framework: string;
  [id: string]: any;
}

export interface FormPanelComponent extends FormComponentBase<ComponentType.Panel> {
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

export interface FormMapComponent extends FormComponentBase<ComponentType.Map> {
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

export type FormComponent<T extends ComponentType = ComponentType> = {
  [ComponentType.AddressComponent]: FormAddressComponent;
  [ComponentType.AttachmentList]: FormAttachmentListComponent;
  [ComponentType.Button]: FormButtonComponent;
  [ComponentType.Checkboxes]: FormCheckboxesComponent;
  [ComponentType.Datepicker]: FormDatepickerComponent;
  [ComponentType.Dropdown]: FormDropdownComponent;
  [ComponentType.FileUploadWithTag]: FormFileUploaderWithTagComponent;
  [ComponentType.FileUpload]: FormFileUploaderComponent;
  [ComponentType.Group]: FormGroupComponent;
  [ComponentType.Header]: FormHeaderComponent;
  [ComponentType.Image]: FormImageComponent;
  [ComponentType.Input]: FormInputComponent;
  [ComponentType.Map]: FormMapComponent;
  [ComponentType.NavigationBar]: FormNavigationBarComponent;
  [ComponentType.NavigationButtons]: FormButtonComponent;
  [ComponentType.Panel]: FormPanelComponent;
  [ComponentType.Paragraph]: FormParagraphComponent;
  [ComponentType.RadioButtons]: FormRadioButtonsComponent;
  [ComponentType.TextArea]: FormTextareaComponent;
  [ComponentType.ThirdParty]: FormThirdPartyComponent;
}[T];
