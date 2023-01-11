import type { IWidgetState } from '../features/widgets/widgetsSlice';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IErrorState } from '../features/error/errorSlice';
import type { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import type { IServiceConfigurationState } from '../features/serviceConfigurations/serviceConfigurationTypes';

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

export interface IAltinnEditableComponent {
  ModalContent: () => JSX.Element;
}

export interface IContainerProvidedProps {
  containerIndex: number;
}

export interface IRowProvidedProps {
  containerIndex: number;
  rowIndex: number;
}

export interface IColumnProvidedProps {
  containerIndex: number;
  rowIndex: number;
  columnIndex: number;
}

export interface IOptions {
  label: string;
  value: any;
}

export interface ICreateFormContainer {
  index?: number;
  itemType?: string;
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
  itemType?: string;
  type?: string;
  name?: string;
  size?: string;
  options?: IOptions[];
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
  disabled?: boolean;
  required?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  [id: string]: any;
}

export interface IFormHeaderComponent extends IFormComponent {
  size: string;
}

export interface IFormInputComponent extends IFormComponent {
  type: string;
  disabled?: boolean;
}

export interface IFormCheckboxComponent extends IFormComponent {
  options: IOptions[];
  preselectedOptionIndex?: number;
  optionsId: string;
}

export interface IFormButtonComponent extends IFormComponent {
  onClickAction: () => void;
}

export interface IFormRadioButtonComponent extends IFormComponent {
  options: IOptions[];
  preselectedOptionIndex?: number;
  optionsId: string;
}

export interface IFormGenericOptionsComponent extends IFormComponent {
  options: IOptions[];
  preselectedOptionIndex?: number;
  optionsId: string;
}

export interface IFormDropdownComponent extends IFormComponent {
  optionsId: string;
}

export interface IFormFileUploaderComponent extends IFormComponent {
  description: string;
  hasCustomFileEndings: boolean;
  maxFileSizeInMB: number;
  displayMode: string;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  validFileEndings?: string;
}

export interface IFormFileUploaderWithTagComponent extends IFormComponent {
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
  image?: {
    src?: {
      [lang: string]: string;
    };
    align?: string | null;
    width?: string;
  };
}

export interface IFormAddressComponent extends IFormComponent {
  simplified: boolean;
}

export interface IFormGroupComponent extends IFormComponent {
  maxCount: number;
  children: string[];
}

export interface IFormDatepickerComponent extends IFormComponent {
  timeStamp: boolean;
}

export interface IThirdPartyComponent extends IFormComponent {
  tagName: string;
  framework: string;
  [id: string]: any;
}

export interface PanelComponent extends IFormComponent {
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
export interface IFormDesignerComponentProps {
  [id: string]: IProperties;
}

export interface IFormDesignerContainers {
  [id: string]: ICreateFormContainer;
}

export interface IFormDesignerLayout {
  layouts: IFormLayouts;
}

export interface IFormLayouts {
  [id: string]: IFormLayout;
}

export interface IFormLayout {
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  order: IFormLayoutOrder;
}

export interface IFormLayoutOrder {
  [id: string]: string[];
}

export interface ISelectedLayoutElement {
  elementId: string;
  elementType: string;
  indexes: number[];
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

export interface IDataModelBinding {
  fieldName: string;
  parentGroup: string;
}

/**
 * Defines how each element in the code list element list looks like
 */
export interface ICodeListListElement {
  codeListName: string;
  org: string;
  id: number;
}

export interface IRuleModelFieldElement {
  type: string;
  name: string;
  inputs: any;
}

export interface ITextResource {
  id: string;
  value: string;
  unparsedValue?: string;
  variables?: IVariable[];
}

export interface IVariable {
  key: string;
  dataSource: string;
}

export interface IWidget {
  components: any[];
  texts: IWidgetTexts[];
  displayName: string;
}

export interface IWidgetTexts {
  language: string;
  resources: ITextResource[];
}

export type LogicMode = 'Calculation' | 'Dynamics' | 'Validation' | null;

export interface IToolbarElement {
  label: string;
  icon?: string;
  type: string;
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
