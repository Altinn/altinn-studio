import { IIsLoadingState } from 'src/shared/resources/isLoading/isLoadingSlice';
import { IOptionsState } from 'src/shared/resources/options/optionsReducer';
import { IFormRuleState } from 'src/features/form/rules/rulesReducer';
import { IDataModelState } from 'src/features/form/datamodel/datamodelSlice';
import { JSXElementConstructor, ReactElement } from 'react';
import Ajv from 'ajv/dist/core';
import { IFormDataState } from '../features/form/data/formDataReducer';
import { IFormDynamicState } from '../features/form/dynamics';
import { ILayoutState } from '../features/form/layout/formLayoutSlice';
import { IValidationState } from '../features/form/validation/validationSlice';
import { IInstantiationState } from '../features/instantiate/instantiation/reducer';
import { IApplicationMetadataState } from '../shared/resources/applicationMetadata/reducer';
import { IAttachmentState } from '../shared/resources/attachments/attachmentReducer';
import { IInstanceDataState } from '../shared/resources/instanceData/instanceDataReducers';
import { ILanguageState } from '../shared/resources/language/languageReducers';
import { IOrgsState } from '../shared/resources/orgs/orgsReducers';
import { IPartyState } from '../shared/resources/party/partyReducers';
import { IProcessState } from '../shared/resources/process/processReducer';
import { IProfileState } from '../shared/resources/profile/profileReducers';
import { IQueueState } from '../shared/resources/queue/queueSlice';
import { ITextResourcesState } from '../shared/resources/textResources/textResourcesReducer';

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
  errors?: (string | ReactElement<any, string | JSXElementConstructor<any>>[])[];
  warnings?: (string | ReactElement<any, string | JSXElementConstructor<any>>[])[];
  fixed?: (string | ReactElement<any, string | JSXElementConstructor<any>>[])[];
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

export interface ILayoutSets {
   sets: ILayoutSet[];
}

export interface ILayoutSet{
  id: string;
  dataType: string;
  tasks: string[];
}

export interface ILayoutSettings {
  pages: IPagesSettings;
}

export interface IPagesSettings {
  order: string[];
  triggers?: Triggers[];
  hideCloseButton?: boolean;
}

export interface ILayoutNavigation {
  next?: string;
  previous?: string;
}

export interface INavigationConfig {
  [id: string]: ILayoutNavigation;
}

export interface IOption {
  label: string;
  value: any;
}

export interface IOptions {
  [id: string]: IOption[];
}

export interface IRepeatingGroup {
  count: number;
  baseGroupId?: string;
  dataModelBinding?: string;
  editIndex?: number;
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
  formDynamics: IFormDynamicState;
  formLayout: ILayoutState;
  language: ILanguageState;
}

export interface IRuntimeState {
  applicationMetadata: IApplicationMetadataState;
  attachments: IAttachmentState;
  formData: IFormDataState;
  formDataModel: IDataModelState;
  formDynamics: IFormDynamicState;
  formLayout: ILayoutState;
  formRules: IFormRuleState;
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
  rootElementPath: string;
  schema: any;
  validator: Ajv;
}

export interface ITextResource {
  id: string;
  value: string;
  unparsedValue?: string;
  variables?:IVariable[];
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
  currentView: string;
  currentViewCacheKey?: string;
  returnToView?: string;
  focus: string;
  hiddenFields: string[];
  repeatingGroups?: IRepeatingGroups;
  navigationConfig?: INavigationConfig;
  layoutOrder: string[];
  pageTriggers?: Triggers[];
  hideCloseButton?: boolean;
}

export interface IValidationResult {
  invalidDataTypes: boolean;
  validations: IValidations;
}

export interface IValidations {
  [id: string]: ILayoutValidations;
}

export interface ILayoutValidations {
  [id: string]: IComponentValidations;
}

export interface ICurrentSingleFieldValidation {
  dataModelBinding?: string;
  componentId?: string;
  layoutId?: string;
}

export interface IVariable {
  dataSource: string;
  key: string;
}

export enum ProcessTaskType {
  Unknown = 'unknown',
  Data = 'data',
  Archived = 'ended',
  Confirm = 'confirmation',
  Feedback = 'feedback',
}

export enum PresentationType {
  Stateless = 'stateless',
}

export enum Severity {
  Unspecified = 0,
  Error = 1,
  Warning = 2,
  Informational = 3,
  Fixed = 4,
}

export enum Triggers {
  Validation = 'validation',
  CalculatePageOrder = 'calculatePageOrder',
  ValidatePage = 'validatePage',
  ValidateAllPages = 'validateAllPages'
}

export interface ILabelSettings {
  optionalIndicator?: boolean;
}
