import type { ToolkitStore } from '@reduxjs/toolkit/src/configureStore';
import type Ajv from 'ajv/dist/core';

import type { ExprUnresolved, ExprVal } from 'src/features/expressions/types';
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
  reduxActionLog: any[];
}

export interface IComponentBindingValidation {
  errors?: string[];
  warnings?: string[];
  info?: string[];
  success?: string[];
  fixed?: string[];
}

export type ValidationKey = keyof IComponentBindingValidation;
export type ValidationKeyOrAny = ValidationKey | 'any';

export interface IComponentValidations {
  [id: string]: IComponentBindingValidation | undefined;
}

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
  components?: IComponentsSettings;
  receiptLayoutName: string;
}

export interface IPagesSettings {
  order: string[];
  triggers?: Triggers[];
  hideCloseButton?: boolean;
  showProgress?: boolean;
  showLanguageSelector?: boolean;
  showExpandWidthButton?: boolean;
  excludeFromPdf?: string[];
  pdfLayoutName?: string;
}

export interface IComponentsSettings {
  excludeFromPdf?: string[];
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
  [layoutKey: string]: ExprVal.Boolean | undefined;
}

export interface IUiConfig {
  autoSave: boolean | null | undefined;
  receiptLayoutName?: string;
  currentView: string;
  currentViewCacheKey?: string;
  returnToView?: string;
  focus: string | null | undefined;
  hiddenFields: string[];
  repeatingGroups: IRepeatingGroups | null;
  fileUploadersWithTag?: IFileUploadersWithTag;
  navigationConfig?: INavigationConfig;
  tracks: ITracks;
  excludePageFromPdf: string[] | null;
  excludeComponentFromPdf: string[] | null;
  pdfLayoutName?: string;
  pageTriggers?: Triggers[];
  hideCloseButton?: boolean;
  showLanguageSelector?: boolean;
  showProgress?: boolean;
  showExpandWidthButton?: boolean;
  expandedWidth?: boolean;
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
  hiddenExpr: ExprUnresolved<IHiddenLayoutsExpressions>;
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

export type TriggersPageValidation = Triggers.ValidateAllPages | Triggers.ValidatePage;

/**
 * Reduces a list of validation triggers to be only one value (preferring validation for all pages
 * over single-page validation). Useful for places that only care about page validation.
 */
export function reducePageValidations(triggers?: Triggers[]): TriggersPageValidation | undefined {
  return triggers?.includes(Triggers.ValidateAllPages)
    ? Triggers.ValidateAllPages
    : triggers?.includes(Triggers.ValidatePage)
    ? Triggers.ValidatePage
    : undefined;
}

export interface ILabelSettings {
  optionalIndicator?: boolean;
}

export enum DateFlags {
  Today = 'today',
}

/**
 * A 'mapping' is an object pointing from data model paths to query parameters. It is used to make options lookups
 * (and similar) configurable in a way that lets you (for example) implement searching. If you map the data model
 * path where a search string is stored, you can make the app automatically fetch new options from the backend every
 * time the search string changes.
 *
 * When used in repeating groups, it is expected you put index placeholders inside the data model path, so if your
 * group is bound to 'MyModel.Persons' and you're looking up 'MyModel.Persons.FirstName', the path to the data model
 * should be 'MyModel.Persons[{0}].FirstName'. This way, {0} is replaced with the current row index in the repeating
 * group at runtime.
 *
 * Format:
 * {
 *   'path.to.dataModel': 'queryParam',
 * }
 *
 * @see https://docs.altinn.studio/app/development/data/options/#pass-query-parameters-when-fetching-options
 */
export interface IMapping {
  [dataModelPath: string]: string;
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
