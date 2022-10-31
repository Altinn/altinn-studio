import type { ILayouts } from 'src/features/form/layout';
import type {
  IFileUploadersWithTag,
  IHiddenLayoutsExpressions,
  ILayoutSets,
  ILayoutSettings,
  INavigationConfig,
  IOption,
} from 'src/types';

export interface IFormLayoutActionRejected {
  error: Error;
}

export interface IFetchLayoutFulfilled {
  layouts: ILayouts;
  navigationConfig?: INavigationConfig;
  hiddenLayoutsExpressions: IHiddenLayoutsExpressions;
}

export interface IFetchLayoutSetsFulfilled {
  layoutSets: ILayoutSets;
}

export interface IFetchLayoutSettingsFulfilled {
  settings: ILayoutSettings;
}

export interface ISetCurrentViewCacheKey {
  key: string;
}

export interface IUpdateAutoSave {
  autoSave: boolean;
}

export interface IUpdateCurrentView {
  newView: string;
  returnToView?: string;
  runValidations?: 'allPages' | 'page';
  skipPageCaching?: boolean;
  focusComponentId?: string;
  keepScrollPos?: IKeepComponentScrollPos;
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
  focusComponentId: string;
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
  index: number;
}

export interface IUpdateRepeatingGroupsEditIndex {
  group: string;
  index: number;
  validate?: boolean;
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
  offsetTop: number;
}

export interface ICalculatePageOrderAndMoveToNextPage {
  runValidations?: 'allPages' | 'page';
  skipMoveToNext?: boolean;
  keepScrollPos?: IKeepComponentScrollPos;
}

export interface ICalculatePageOrderAndMoveToNextPageFulfilled {
  order: string[];
}

export interface IHiddenLayoutsUpdate {
  hiddenLayouts: string[];
}
