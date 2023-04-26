import type { IWidgetState } from '../features/widgets/widgetsSlice';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IErrorState } from '../features/error/errorSlice';
import type { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import type { IServiceConfigurationState } from '../features/serviceConfigurations/serviceConfigurationTypes';
import { ComponentType } from '../components';
import { ITextResource, ITextResources } from 'app-shared/types/global';

export interface IFormDesignerNameSpace<T1, T2, T3, T4, T5> {
  formDesigner: T1;
  serviceConfigurations: T2;
  appData: T3;
  errors: T4;
  widgets: T5;
}
export type IAppState = IFormDesignerNameSpace<
  IFormDesignerState,
  IServiceConfigurationState,
  IAppDataState,
  IErrorState,
  IWidgetState
>;

export interface IOption {
  label: string;
  value: any;
}

export interface ICreateFormContainer {
  index?: number;
  itemType: 'CONTAINER';
  dataModelBindings?: IDataModelBindings;
  maxCount?: number;
  textResourceBindings?: ITextResourceBindings;
  tableHeaders?: string[];
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export interface ICreateFormComponent {
  component?: string;
  itemType: 'COMPONENT';
  type: ComponentType;
  name?: string;
  size?: string;
  options?: IOption[];
  dataModelBindings?: IDataModelBindings;
  textResourceBindings?: ITextResourceBindings;
  customType?: string;
  codeListId?: string;
  triggerValidation?: boolean;
  handleUpdateElement?: (component: FormComponentType) => void;
  handleDeleteElement?: () => void;
  handleUpdateFormData?: (formData: any) => void;
  handleUpdateDataModel?: (dataModelBinding: string) => void;
}

export interface IFormComponent extends ICreateFormComponent {
  id: string;
  itemType: 'COMPONENT';
  type: ComponentType;
  disabled?: boolean;
  required?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  [id: string]: any;
}

export interface IFormHeaderComponent extends IFormComponent {
  type: ComponentType.Header;
  size: string;
}

export interface IFormInputComponent extends IFormComponent {
  type: ComponentType.Input;
  disabled?: boolean;
}

export interface IFormCheckboxComponent extends IFormGenericOptionsComponent {
  type: ComponentType.Checkboxes;
}

export interface IFormButtonComponent extends IFormComponent {
  type: ComponentType.Button | ComponentType.NavigationButtons;
  onClickAction: () => void;
}

export interface IFormRadioButtonComponent extends IFormGenericOptionsComponent {
  type: ComponentType.RadioButtons;
}

export interface IFormGenericOptionsComponent extends IFormComponent {
  options: IOption[];
  preselectedOptionIndex?: number;
  optionsId: string;
}

export interface IFormDropdownComponent extends IFormComponent {
  type: ComponentType.Dropdown;
  optionsId: string;
}

export interface IFormFileUploaderComponent extends IFormComponent {
  type: ComponentType.FileUpload;
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
}

export interface IFormFileUploaderWithTagComponent extends IFormComponent {
  type: ComponentType.FileUploadWithTag;
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
  optionsId: string;
}

export interface IFormDesignerActionRejected {
  error: Error;
}

export interface IDataModelBindings {
  [id: string]: string;
}

export interface IProperties extends IFormComponent {
  [key: string]: string | any;
}

export interface IFormImageComponent extends IFormComponent {
  type: ComponentType.Image;
  image?: {
    src?: {
      [lang: string]: string;
    };
    align?: string | null;
    width?: string;
  };
}

export interface IFormAddressComponent extends IFormComponent {
  type: ComponentType.AddressComponent;
  simplified: boolean;
}

export interface IFormDatepickerComponent extends IFormComponent {
  type: ComponentType.Datepicker;
  timeStamp: boolean;
}

export interface IThirdPartyComponent extends IFormComponent {
  type: ComponentType.ThirdParty;
  tagName: string;
  framework: string;
  [id: string]: any;
}

export interface PanelComponent extends IFormComponent {
  type: ComponentType.Panel;
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

export interface MapComponent extends IFormComponent {
  type: ComponentType.Map;
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

export type FormComponentType =
  | IFormComponent
  | IFormHeaderComponent
  | IFormInputComponent
  | IFormCheckboxComponent
  | IFormButtonComponent
  | IFormRadioButtonComponent
  | IFormDropdownComponent
  | IFormFileUploaderComponent
  | IFormFileUploaderWithTagComponent
  | IFormAddressComponent
  | IFormImageComponent
  | IFormDatepickerComponent
  | IThirdPartyComponent
  | PanelComponent
  | MapComponent;

export interface IFormDesignerComponents {
  [id: string]: IFormComponent;
}

export interface IFormDesignerContainers {
  [id: string]: ICreateFormContainer;
}

export interface IFormLayouts {
  [id: string]: IInternalLayout;
}

export interface IInternalLayout {
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  order: IFormLayoutOrder;
  hidden?: any;
}

export interface IExternalFormLayouts {
  [id: string]: IExternalFormLayout;
}

export interface IExternalFormLayout {
  $schema: string;
  data: IExternalData;
  hidden?: any;
}

export interface IExternalComponent {
  id: string;
  type: ComponentType;
  [key: string]: any; // Todo: Set type here
}

export interface IExternalData {
  layout: IExternalComponent[];
  hidden?: boolean;
}

export interface IFormLayoutOrder {
  [id: string]: string[];
}

export interface IDataModelFieldElement {
  choices?: any;
  customProperties?: any;
  dataBindingName: string;
  displayString: string;
  fixedValue?: any;
  id: string;
  isReadOnly: boolean;
  isTagContent: boolean;
  jsonSchemaPointer: string;
  maxOccurs: number;
  minOccurs: number;
  name: string;
  parentElement: string;
  restrictions: any;
  texts: any;
  type: string;
  typeName?: string;
  xmlSchemaXPath: string;
  xName?: string;
  xPath: string;
  xsdValueType?: string;
}

export interface IRuleModelFieldElement {
  type: 'rule' | 'condition';
  name: string;
  inputs: any;
}

export interface IWidget {
  components: any[];
  texts: IWidgetTexts[];
  displayName: ComponentType;
}

export interface IWidgetTexts {
  language: string;
  resources: ITextResource[];
}

export interface IToolbarElement {
  label: string;
  icon?: string;
  type: ComponentType;
  actionMethod: (containerId: string, position: number) => void;
}

export enum CollapsableMenus {
  Components = 'schema',
  Texts = 'texts',
  AdvancedComponents = 'advanced',
  Widgets = 'widget',
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

export type AppStateSelector<T> = (state: IAppState) => T;

export type FormLayoutsSelector<T> = (state: IAppState, formLayoutsData: IFormLayouts) => T;

export type TextResourcesSelector<T> = (textResources: ITextResources) => T;
