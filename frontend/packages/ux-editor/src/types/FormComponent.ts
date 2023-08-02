import { ComponentType } from 'app-shared/types/ComponentType';
import { IDataModelBindings, ITextResourceBindings, IOption } from './global';

export interface FormComponentBase<T extends ComponentType = ComponentType> {
  id: string;
  component?: string;
  itemType: 'COMPONENT';
  type: T;
  name?: string;
  size?: string;
  options?: IOption[];
  dataModelBindings?: IDataModelBindings;
  textResourceBindings?: ITextResourceBindings;
  customType?: string;
  codeListId?: string;
  triggerValidation?: boolean;
  handleUpdateElement?: (component: FormComponent) => void;
  handleDeleteElement?: () => void;
  handleUpdateFormData?: (formData: any) => void;
  handleUpdateDataModel?: (dataModelBinding: string) => void;
  disabled?: boolean; // Add expression type?
  required?: boolean; // Add expression type?
  hidden?: boolean; // Add expression type?
  readOnly?: boolean; // Add expression type?
  [id: string]: any;
  propertyPath?: string;
}

interface FormOptionsComponentBase<T extends ComponentType> extends FormComponentBase<T> {
  options?: IOption[];
  preselectedOptionIndex?: number;
  optionsId?: string;
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

export interface FormFileUploaderWithTagComponent
  extends FormComponentBase<ComponentType.FileUploadWithTag> {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
  optionsId: string;
}

export interface FormButtonComponent
  extends FormComponentBase<ComponentType.Button | ComponentType.NavigationButtons> {
  onClickAction: () => void;
}

export interface FormNavigationButtonsComponent extends FormButtonComponent {
  showBackButton?: boolean;
  showPrev?: boolean;
}

export interface FormAddressComponent extends FormComponentBase<ComponentType.AddressComponent> {
  simplified: boolean;
}

export type FormGroupComponent = FormComponentBase<ComponentType.Group>;
export type FormNavigationBarComponent = FormComponentBase<ComponentType.NavigationBar>;
export type FormAttachmentListComponent = FormComponentBase<ComponentType.AttachmentList>;

export interface FormThirdPartyComponent extends FormComponentBase<ComponentType.Custom> {
  tagName: string;
  framework: string;
  [id: string]: any;
}

export enum FormPanelVariant {
  Info = 'info',
  Warning = 'warning',
  Success = 'success',
}

export interface FormPanelComponent extends FormComponentBase<ComponentType.Panel> {
  variant: FormPanelVariant;
  showIcon: boolean;
}

export interface FormMapLayer {
  url: string;
  attribution?: string;
  subdomains?: string[];
}

export interface FormMapComponent extends FormComponentBase<ComponentType.Map> {
  centerLocation: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  layers?: FormMapLayer[];
}

export type FormComponent<T extends ComponentType = ComponentType> = {
  [ComponentType.ActionButton]: FormComponentBase<ComponentType.ActionButton>;
  [ComponentType.AddressComponent]: FormAddressComponent;
  [ComponentType.AttachmentList]: FormAttachmentListComponent;
  [ComponentType.Button]: FormButtonComponent;
  [ComponentType.ButtonGroup]: FormComponentBase<ComponentType.ButtonGroup>;
  [ComponentType.Checkboxes]: FormCheckboxesComponent;
  [ComponentType.Custom]: FormThirdPartyComponent;
  [ComponentType.Datepicker]: FormDatepickerComponent;
  [ComponentType.Dropdown]: FormDropdownComponent;
  [ComponentType.FileUploadWithTag]: FormFileUploaderWithTagComponent;
  [ComponentType.FileUpload]: FormFileUploaderComponent;
  [ComponentType.Grid]: FormComponentBase<ComponentType.Grid>;
  [ComponentType.Group]: FormGroupComponent;
  [ComponentType.Header]: FormHeaderComponent;
  [ComponentType.IFrame]: FormComponentBase<ComponentType.IFrame>;
  [ComponentType.Image]: FormImageComponent;
  [ComponentType.Input]: FormInputComponent;
  [ComponentType.InstanceInformation]: FormComponentBase<ComponentType.InstanceInformation>;
  [ComponentType.InstantiationButton]: FormComponentBase<ComponentType.InstantiationButton>;
  [ComponentType.Likert]: FormComponentBase<ComponentType.Likert>;
  [ComponentType.Link]: FormComponentBase<ComponentType.Link>;
  [ComponentType.List]: FormComponentBase<ComponentType.List>;
  [ComponentType.Map]: FormMapComponent;
  [ComponentType.MultipleSelect]: FormComponentBase<ComponentType.MultipleSelect>;
  [ComponentType.NavigationBar]: FormNavigationBarComponent;
  [ComponentType.NavigationButtons]: FormNavigationButtonsComponent;
  [ComponentType.Panel]: FormPanelComponent;
  [ComponentType.Paragraph]: FormParagraphComponent;
  [ComponentType.PrintButton]: FormComponentBase<ComponentType.PrintButton>;
  [ComponentType.RadioButtons]: FormRadioButtonsComponent;
  [ComponentType.Summary]: FormComponentBase<ComponentType.Summary>;
  [ComponentType.TextArea]: FormTextareaComponent;
}[T];
