import { Triggers } from 'src/layout/common.generated';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { IKeepComponentScrollPos } from 'src/features/layout/formLayoutTypes';
import type { ILayoutNavigation, IMapping } from 'src/layout/common.generated';
import type { RootState } from 'src/redux/store';

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
  receiptLayoutName?: string;
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
  autoSaveBehavior?: 'onChangePage' | 'onChangeFormData';
}

export interface IComponentsSettings {
  excludeFromPdf?: string[];
}

export interface INavigationConfig {
  [id: string]: ILayoutNavigation | undefined;
}

export interface IRepeatingGroup {
  index: number;
  baseGroupId?: string;
  dataModelBinding?: string;
  editIndex?: number;
  deletingIndex?: number[];
  multiPageIndex?: number;
  isLoading?: boolean;
}

export interface IRepeatingGroups {
  [id: string]: IRepeatingGroup;
}

export interface IRules {
  [id: string]: () => Record<string, string>;
}

export type RuleFunc<T extends Record<string, any>> = (argObject: T) => T;

export interface IRuleObject {
  [id: string]: RuleFunc<any>;
}

export type IRuntimeState = RootState;
export type IRuntimeStore = IRuntimeState;

export interface ISimpleInstance {
  id: string;
  lastChanged: string;
  lastChangedBy: string;
}

export interface IHiddenLayoutsExternal {
  [layoutKey: string]: ExprValToActualOrExpr<ExprVal.Boolean> | undefined;
}

export interface IUiConfig {
  autoSaveBehavior?: 'onChangePage' | 'onChangeFormData';
  receiptLayoutName?: string;
  currentView: string;
  currentViewCacheKey?: string;
  returnToView?: string;
  focus: string | null | undefined;
  hiddenFields: string[];
  repeatingGroups: IRepeatingGroups | null;
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
  hiddenExpr: IHiddenLayoutsExternal;
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

export type TriggersPageValidation =
  | Triggers.ValidateAllPages
  | Triggers.ValidateCurrentAndPreviousPages
  | Triggers.ValidatePage;

/**
 * Reduces a list of validation triggers to be only one value (preferring validation for all pages
 * over single-page validation). Useful for places that only care about page validation.
 */
export function reducePageValidations(triggers?: Triggers[]): TriggersPageValidation | undefined {
  return triggers?.includes(Triggers.ValidateAllPages)
    ? Triggers.ValidateAllPages
    : triggers?.includes(Triggers.ValidateCurrentAndPreviousPages)
    ? Triggers.ValidateCurrentAndPreviousPages
    : triggers?.includes(Triggers.ValidatePage)
    ? Triggers.ValidatePage
    : undefined;
}

export enum DateFlags {
  Today = 'today',
}

export interface IFetchSpecificOptionSaga {
  optionsId: string;
  formData?: IFormData;
  language?: string;
  dataMapping?: IMapping;
  fixedQueryParameters?: Record<string, string>;
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
