import type Ajv from 'ajv/dist/core';

import type { IFormData } from 'src/features/form/data';
import type { IKeepComponentScrollPos } from 'src/features/form/layout/formLayoutTypes';
import type { RootState } from 'src/store';

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
  info?: string[];
  success?: string[];
  fixed?: string[];
}

export interface IComponentValidations {
  [id: string]: IComponentBindingValidation;
}

export { IDataModelBindings } from '../features/form/layout';

export interface IFormFileUploaderWithTag {
  chosenOptions: IOptionsChosen;
  editIndex: number;
}

export interface IOptionsChosen {
  [id: string]: string;
}

export interface IFileUploadersWithTag {
  [componentId: string]: IFormFileUploaderWithTag;
}

export interface ILayoutSets {
  sets: ILayoutSet[];
  uiSettings?: Omit<IPagesSettings, 'order'>;
}

export interface ILayoutSet {
  id: string;
  dataType: string;
  tasks?: string[];
}

export interface ILayoutSettings {
  pages: IPagesSettings;
}

export interface IPagesSettings {
  order: string[];
  triggers?: Triggers[];
  hideCloseButton?: boolean;
  showProgress?: boolean;
  showLanguageSelector?: boolean;
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
  [key: string]: IOptionData;
}

export interface IOptionSource {
  group: string;
  label: string;
  value: string;
}

export interface IOptionsActualData {
  options?: IOption[];
}

export interface IOptionsMetaData {
  id: string;
  mapping?: IMapping;
  loading?: boolean;
  secure?: boolean;
}

export type IOptionData = IOptionsActualData & IOptionsMetaData;

export interface IRepeatingGroup {
  index: number;
  baseGroupId?: string;
  dataModelBinding?: string;
  editIndex?: number;
  deletingIndex?: number[];
}

export interface IRepeatingGroups {
  [id: string]: IRepeatingGroup;
}

export interface IRules {
  [id: string]: any;
}

export type IRuntimeState = RootState;
export type IRuntimeStore = IRuntimeState;

export interface ISchemaValidator {
  rootElementPath: string;
  schema: any;
  validator: Ajv;
}

export interface ISimpleInstance {
  id: string;
  lastChanged: string;
  lastChangedBy: string;
}

export interface ITextResource {
  id: string;
  value: string;
  unparsedValue?: string;
  variables?: IVariable[];
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
  fileUploadersWithTag?: IFileUploadersWithTag;
  navigationConfig?: INavigationConfig;
  layoutOrder: string[];
  pageTriggers?: Triggers[];
  hideCloseButton?: boolean;
  showLanguageSelector?: boolean;
  showProgress?: boolean;
  keepScrollPos?: IKeepComponentScrollPos;
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

export enum LayoutStyle {
  Column = 'column',
  Row = 'row',
  Table = 'table',
}

export enum Severity {
  Unspecified = 0,
  Error = 1,
  Warning = 2,
  Informational = 3,
  Fixed = 4,
  Success = 5,
}

export enum Triggers {
  Validation = 'validation',
  CalculatePageOrder = 'calculatePageOrder',
  ValidatePage = 'validatePage',
  ValidateAllPages = 'validateAllPages',
}

export interface ILabelSettings {
  optionalIndicator?: boolean;
}

export enum DateFlags {
  Today = 'today',
}

// source, target dict
export interface IMapping {
  [source: string]: string;
}

export interface IFetchSpecificOptionSaga {
  optionsId: string;
  formData?: IFormData;
  language?: string;
  dataMapping?: IMapping;
  secure?: boolean;
  instanceId?: string;
}

export interface IPartyIdInterfaceGuidParams {
  partyId: string;
  instanceGuid: string;
}

/**
 * This function can be used to have TypeScript enforce that we never reach the code branch in question
 * @see https://stackoverflow.com/a/39419171
 */
export function assertUnreachable<Ret = never>(
  _x: never,
  execute?: () => Ret,
): Ret {
  if (execute) {
    return execute();
  }
  throw new Error('Reached unreachable code');
}
