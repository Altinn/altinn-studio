import { IIsLoadingState } from 'src/resources/isLoading/isLoadingReducers';
import { IOptionsState } from 'src/resources/options/optionsReducer';
import ajv from 'ajv';
import { IFormDataState } from '../features/form/data/formDataReducer';
import { IDataModelState } from '../features/form/datamodel/formDatamodelReducer';
import { IValidationState } from '../features/form/validation/validationReducer';
import { IInstantiationState } from '../features/instantiate/instantiation/reducer';
import { IApplicationMetadataState } from '../resources/applicationMetadata/reducer';
import { IAttachmentState } from '../resources/attachments/attachmentReducer';
import { IInstanceDataState } from '../resources/instanceData/instanceDataReducers';
import { ILanguageState } from '../resources/language/languageReducers';
import { IOrgsState } from '../resources/orgs/orgsReducers';
import { IPartyState } from '../resources/party/partyReducers';
import { IProcessState } from '../resources/process/processReducer';
import { IProfileState } from '../resources/profile/profileReducers';
import { IQueueState } from '../resources/queue/queueReducer';
import { ITextResourcesState } from '../resources/textResources/textResourcesReducer';

export type FormComponentType =
  | IFormAddressComponent
  | IFormButtonComponent
  | IFormCheckboxComponent
  | IFormComponent
  | IFormDropdownComponent
  | IFormFileUploaderComponent
  | IFormHeaderComponent
  | IFormInputComponent
  | IFormRadioButtonComponent
  | IFormTextAreaComponent;

export interface IAltinnWindow extends Window {
  app: string;
  conditionalRuleHandlerHelper: IRules;
  instanceId: string;
  org: string;
  reportee: string;
}

export interface IComponentBindingValidation {
  errors?: string[];
  warnings?: string[];
}

export interface IComponentValidations {
  [id: string]: IComponentBindingValidation;
}

export interface IDataModelBinding {
  fieldName: string;
  parentGroup: string;
}

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

export interface IFormAddressComponent extends IFormComponent {
  simplified: boolean;
}

export interface IFormButtonComponent extends IFormComponent {
  onClickAction: () => void;
}

export interface IFormCheckboxComponent extends IFormComponent {
  options: IOption[];
  preselectedOptionIndex?: number;
}

export interface IFormComponent {
  id: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
}

export interface IFormDropdownComponent extends IFormComponent {
  options: IOption[];
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

export interface IFormHeaderComponent extends IFormComponent {
  size: string;
}

export interface IFormInputComponent extends IFormComponent {
  type: string;
  disabled?: boolean;
}

export interface IFormRadioButtonComponent extends IFormComponent {
  options: IOption[];
  preselectedOptionIndex?: number;
}

export interface IFormTextAreaComponent extends IFormComponent { }

export interface IOption {
  label: string;
  value: any;
}

export interface IOptions {
  [id: string]: IOption[];
}

export interface IRepeatingGroup {
  count: number;
}

export interface IRepeatingGroups {
  [id: string]: IRepeatingGroup;
}

export interface IRules {
  [id: string]: any;
}

export interface IRuntimeStore {
  attachments: IAttachmentState;
  formData: IFormDataState;
  formDataModel: IDataModelState;
  language: ILanguageState;
}

export interface IRuntimeState {
  applicationMetadata: IApplicationMetadataState;
  attachments: IAttachmentState;
  formData: IFormDataState;
  formDataModel: IDataModelState;
  formValidations: IValidationState;
  instanceData: IInstanceDataState;
  instantiation: IInstantiationState;
  isLoading: IIsLoadingState;
  language: ILanguageState;
  optionState: IOptionsState;
  organisationMetaData: IOrgsState;
  party: IPartyState;
  process: IProcessState;
  profile: IProfileState;
  queue: IQueueState;
  textResources: ITextResourcesState;
}

export interface ISchemaValidator {
  rootElement: any;
  rootElementPath: string;
  schema: any;
  validator: ajv.Ajv;
}

export interface ITextResource {
  id: string;
  value: string;
  unparsedValue: string;
  variables:IVariable[];
}

export interface ITextResourceBindings {
  [id: string]: string;
}

export interface IValidationIssue {
  code: string;
  description: string;
  field: string;
  scope: string;
  severity: Severity;
  targetId: string;
}

export interface IUiConfig {
  autoSave: boolean;
  focus: string;
  hiddenFields: string[];
  repeatingGroups?: IRepeatingGroups;
}

export interface IValidationResult {
  invalidDataTypes: boolean;
  validations: IValidations;
}

export interface IValidations {
  [id: string]: IComponentValidations;
}

export interface IVariable {
  dataSource: string;
  key: string;
}

export enum ProcessSteps {
  Unknown = 'unknown',
  Data = 'data',
  Archived = 'ended',
  Confirm = 'confirmation',
  Feedback = 'feedback',
}

export enum Severity {
  Unspecified = 0,
  Error = 1,
  Warning = 2,
  Informational = 3,
}

export enum Triggers {
  Validation = 'validation',
}
