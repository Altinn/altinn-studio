import type { ExprUnresolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { ILayouts } from 'src/layout/layout';
import type {
  IFileUploadersWithTag,
  IHiddenLayoutsExpressions,
  ILayoutSets,
  ILayoutSettings,
  INavigationConfig,
  IOption,
  Triggers,
  TriggersPageValidation,
} from 'src/types';

export interface IFormLayoutActionRejected {
  error: Error | null;
  group?: string;
}

export interface IFetchLayoutFulfilled {
  layouts: ILayouts;
  navigationConfig?: INavigationConfig;
  hiddenLayoutsExpressions: ExprUnresolved<IHiddenLayoutsExpressions>;
}

export interface IFetchLayoutSetsFulfilled {
  layoutSets: ILayoutSets | null;
}

export interface IFetchLayoutSettingsFulfilled {
  settings: ILayoutSettings | null;
}

export interface ISetCurrentViewCacheKey {
  key: string | undefined;
}

export interface IUpdateAutoSave {
  autoSave: boolean | undefined;
}

export interface IUpdateCurrentView {
  newView: string;
  returnToView?: string;
  runValidations?: TriggersPageValidation;
  skipPageCaching?: boolean;
  focusComponentId?: string;
  keepScrollPos?: IKeepComponentScrollPos;
  allowNavigationToHidden?: boolean;
}

export interface IUpdateCurrentViewFulfilled {
  newView: string;
  returnToView?: string;
  focusComponentId?: string;
}

export interface IUpdateCurrentViewRejected extends IFormLayoutActionRejected {
  keepScrollPos?: IKeepComponentScrollPos;
}

export interface IUpdateFocus {
  focusComponentId: string | null;
}

export interface IUpdateHiddenComponents {
  componentsToHide: string[];
}

export interface IUpdateRepeatingGroups {
  layoutElementId: string;
  remove?: boolean;
  index?: number;
}

export interface IUpdateRepeatingGroupsFulfilled {
  repeatingGroups: any;
}

export interface IUpdateRepeatingGroupsRemoveCancelled {
  layoutElementId: string;
  index: number;
}

export interface IUpdateRepeatingGroupsMultiPageIndex {
  group: string;
  index: number | undefined;
}

export interface IUpdateRepeatingGroupsEditIndex {
  group: string;
  index: number;
  validate?: Triggers.Validation | Triggers.ValidateRow;
  shouldAddRow?: boolean;
}

export interface IUpdateRepeatingGroupsEditIndexFulfilled {
  group: string;
  index: number;
}

export interface IUpdateFileUploadersWithTagFulfilled {
  uploaders: IFileUploadersWithTag;
}

export interface IUpdateFileUploaderWithTagEditIndex {
  componentId: string;
  baseComponentId: string;
  index: number;
  attachmentId?: string;
}

export interface IUpdateFileUploaderWithTagEditIndexFulfilled {
  componentId: string;
  baseComponentId: string;
  index: number;
}

export interface IUpdateFileUploaderWithTagChosenOptions {
  componentId: string;
  baseComponentId: string;
  id: string;
  option: IOption;
}
export interface IUpdateFileUploaderWithTagChosenOptionsFulfilled {
  componentId: string;
  baseComponentId: string;
  id: string;
  option: IOption;
}

/**
 * Setting this keeps the component with the given componentId in the same viewport position after rendering
 * new content above it. Support for this is implemented in the 'NavigationButtons' component, such that the
 * component is visible on screen (in the same location) even if progressing to the next page fails, and
 * validation messages are displayed above the navigation buttons.
 */
export interface IKeepComponentScrollPos {
  componentId: string;
  offsetTop: number | undefined;
}

export interface ICalculatePageOrderAndMoveToNextPage {
  runValidations?: TriggersPageValidation;
  skipMoveToNext?: boolean;
  keepScrollPos?: IKeepComponentScrollPos;
}

export interface ICalculatePageOrderAndMoveToNextPageFulfilled {
  order: string[];
}

export interface IHiddenLayoutsUpdate {
  hiddenLayouts: string[];
}

export interface IInitRepeatingGroups {
  changedFields?: IFormData;
}
