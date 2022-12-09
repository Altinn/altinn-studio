import type { ToolkitStore } from '@reduxjs/toolkit/src/configureStore';
import type Ajv from 'ajv/dist/core';

import type { ExpressionOr } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/form/data';
import type { IKeepComponentScrollPos } from 'src/features/form/layout/formLayoutTypes';
import type { RootState } from 'src/store';

export interface IAltinnWindow extends Window {
  app: string;
  conditionalRuleHandlerHelper: IRules;
  instanceId: string;
  org: string;
  reportee: string;
  evalExpression: (maybeExpression: any, forComponentId?: string) => any;
  reduxStore: ToolkitStore<IRuntimeState>;
}

export interface IComponentBindingValidation {
  errors?: string[];
  warnings?: string[];
  info?: string[];
  success?: string[];
  fixed?: string[];
}

export interface IComponentValidations {
  [id: string]: IComponentBindingValidation | undefined;
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
  [componentId: string]: IFormFileUploaderWithTag | undefined;
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
  [id: string]: ILayoutNavigation | undefined;
}

export interface IOption {
  label: string;
  value: any;
}

export interface IOptions {
  [key: string]: IOptionData | undefined;
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
  multiPageIndex?: number;
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
  scope: string | null;
  severity: Severity;
  targetId: string;
}

export interface IHiddenLayoutsExpressions {
  [layoutKey: string]: ExpressionOr<'boolean'> | undefined;
}

export interface IUiConfig {
  autoSave: boolean | null | undefined;
  currentView: string;
  currentViewCacheKey?: string;
  returnToView?: string;
  focus: string | null | undefined;
  hiddenFields: string[];
  repeatingGroups: IRepeatingGroups | null;
  fileUploadersWithTag?: IFileUploadersWithTag;
  navigationConfig?: INavigationConfig;
  tracks: ITracks;
  pageTriggers?: Triggers[];
  hideCloseButton?: boolean;
  showLanguageSelector?: boolean;
  showProgress?: boolean;
  keepScrollPos?: IKeepComponentScrollPos;
}

/**
 * This state includes everything needed to calculate which layouts should be shown, and their order.
 * @see https://docs.altinn.studio/app/development/ux/pages/tracks/
 */
export interface ITracks {
  /**
   * The main 'order' is the list of layouts available, or which layouts the server tells us to display. If a layout
   * is not in this list, it should be considered hidden. It will be null until layouts have been fetched.
   *
   * Do NOT use this directly, as it will not respect layouts hidden using expressions!
   * @see getLayoutOrderFromTracks
   * @see selectLayoutOrder
   */
  order: string[] | null;

  /**
   * This state contains the results from calculating `hiddenExpr` (expressions to decide if a certain layout should
   * be hidden or not). If a layout is in this list, is should also not be displayed.
   */
  hidden: string[];

  /**
   * List of expressions containing logic used to show/hide certain layouts.
   */
  hiddenExpr: IHiddenLayoutsExpressions;
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
  ValidateRow = 'validateRow',
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

/**
 * This function can be used to have TypeScript enforce that we never reach the code branch in question
 * @see https://stackoverflow.com/a/39419171
 */
export function assertUnreachable<Ret = never>(_x: never, execute?: () => Ret): Ret {
  if (execute) {
    return execute();
  }
  throw new Error('Reached unreachable code');
}
