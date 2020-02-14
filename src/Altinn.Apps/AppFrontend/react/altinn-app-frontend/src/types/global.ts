import { IFormConfigState } from '../features/form/config/formConfigReducer';
import { IFormDataState } from '../features/form/data/formDataReducer';
import { IDataModelState } from '../features/form/datamodel/formDatamodelReducer';
import { IFormDynamicState } from '../features/form/dynamics';
import { ILayoutState } from '../features/form/layout/formLayoutReducer';
import { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import { ILanguageState } from '../shared/resources/language/languageReducers';

export interface IRuntimeStore {
  formLayout: ILayoutState;
  formData: IFormDataState;
  formConfig: IFormConfigState;
  formDataModel: IDataModelState;
  attachments: IAttachmentState;
  formDynamics: IFormDynamicState;
  language: ILanguageState;
}

export interface IAltinnWindow extends Window {
  org: string;
  app: string;
  instanceId: string;
  reportee: string;
  conditionalRuleHandlerHelper: IRules;
}

export interface IRules {
  [id: string]: any;
}

// Components Types
export interface ICreateFormComponent {
  component: string;
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
  readOnly?: boolean;
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
}

export interface IFormTextAreaComponent extends IFormComponent { }

export interface IFormButtonComponent extends IFormComponent {
  onClickAction: () => void;
}

export interface IFormRadioButtonComponent extends IFormComponent {
  options: IOptions[];
  preselectedOptionIndex?: number;
}

export interface IFormDropdownComponent extends IFormComponent {
  options: IOptions[];
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

export interface IFormAddressComponent extends IFormComponent {
  simplified: boolean;
}

export interface IOptions {
  label: string;
  value: any;
}

export type FormComponentType =
  | IFormComponent
  | IFormHeaderComponent
  | IFormInputComponent
  | IFormCheckboxComponent
  | IFormTextAreaComponent
  | IFormButtonComponent
  | IFormRadioButtonComponent
  | IFormDropdownComponent
  | IFormFileUploaderComponent
  | IFormAddressComponent;

// Texts
export interface ITextResourceBindings {
  [id: string]: string;
}

export interface ITextResource {
  id: string;
  value: string;
}

// Datamodel
export interface IDataModelBindings {
  [id: string]: string;
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

export interface IValidations {
  [id: string]: IComponentValidations;
}

export interface IComponentValidations {
  [id: string]: IComponentBindingValidation;
}

export interface IComponentBindingValidation {
  errors?: string[];
  warnings?: string[];
}

export interface IAttachment {
  uploaded: boolean;
  deleting: boolean;
  name: string;
  size: number;
  id: string;
}

export interface IAttachments {
  [attachmentType: string]: IAttachment[];
}

export interface IUiConfig {
  focus: boolean;
  hiddenFields: string[];
}

export interface IQueueTask {
  isDone: boolean;
  error: any;
}
