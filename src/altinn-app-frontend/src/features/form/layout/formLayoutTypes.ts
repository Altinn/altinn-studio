import type {
  ILayoutSettings,
  INavigationConfig,
  ILayoutSets,
  IOption,
  IFileUploadersWithTag,
} from 'src/types';
import type { ILayouts } from '.';

export interface IFormLayoutActionRejected {
  error: Error;
}

export interface IFetchLayoutFulfilled {
  layouts: ILayouts;
  navigationConfig?: INavigationConfig;
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
}

export interface IUpdateCurrentViewFulfilled {
  newView: string;
  returnToView?: string;
}
export interface IUpdateFocus {
  currentComponentId: string;
  step?: number;
}

export interface IUpdateFocusFulfilled {
  focusComponentId: string;
}

export interface IUpdateHiddenComponents {
  componentsToHide: string[];
}

export interface IUpdateRepeatingGroups {
  layoutElementId: string;
  remove?: boolean;
  index?: number;
  leaveOpen?: boolean;
}

export interface IUpdateRepeatingGroupsFulfilled {
  repeatingGroups: any;
}

export interface IUpdateRepeatingGroupsRemoveCancelled {
  layoutElementId: string;
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

export interface ICalculatePageOrderAndMoveToNextPage {
  runValidations?: 'allPages' | 'page';
  skipMoveToNext?: boolean;
}

export interface ICalculatePageOrderAndMoveToNextPageFulfilled {
  order: string[];
}
