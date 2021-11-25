import { ILayoutSettings, INavigationConfig, ILayoutSets, IOption } from 'src/types';
import { ILayouts } from '.';

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

export interface IUpdateAutoSaveFulfilled {
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
}

export interface IUpdateRepeatingGroupsFulfilled {
  repeatingGroups: any;
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
  uploaders: any;
}

export interface IUpdateFileUploaderWithTagEditIndex {
  uploader: string;
  index: number;
  validate?: boolean;
}

export interface IUpdateFileUploaderWithTagEditIndexFulfilled {
  uploader: string;
  index: number;
}

export interface IUpdateFileUploaderWithTagChosenOptions {
  uploader: string;
  id: string;
  option: IOption;
  validate?: boolean;
}

export interface IUpdateFileUploaderWithTagChosenOptionsFulfilled {
  uploader: string;
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
