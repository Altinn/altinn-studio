import type { IFormData } from 'src/features/formData';
import type { ILayoutSets, ILayoutSettings, Triggers } from 'src/layout/common.generated';
import type { ILayouts } from 'src/layout/layout';
import type { IHiddenLayoutsExternal, TriggersPageValidation } from 'src/types';

export interface IFormLayoutActionRejected {
  error: Error | null;
  group?: string;
}

export interface IFetchLayoutFulfilled {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
  layoutSetId: string | null;
}

export interface IFetchLayoutSetsFulfilled {
  layoutSets: ILayoutSets | null;
}

export interface IFetchLayoutSettingsFulfilled {
  settings: ILayoutSettings | null;
}

export interface IUpdateCurrentView {
  newView: string;
  returnToView?: string;
  runValidations?: TriggersPageValidation;
  skipPageCaching?: boolean;
  focusComponentId?: string;
  keepScrollPos?: IComponentScrollPos;
  allowNavigationToHidden?: boolean;
}

export interface IUpdateCurrentViewFulfilled {
  newView: string;
  returnToView?: string;
  focusComponentId?: string;
}

export interface IUpdateCurrentViewRejected extends IFormLayoutActionRejected {
  keepScrollPos?: IComponentScrollPos;
}

export interface IUpdateHiddenComponents {
  componentsToHide: string[];
  newlyHidden: string[];
  newlyVisible: string[];
}

export interface IUpdateRepeatingGroupsEditIndex {
  group: string;
  index: number;
  validate?: Triggers.Validation | Triggers.ValidateRow;
  shouldAddRow?: boolean;
  currentPageId: string | undefined;
}

export interface IUpdateRepeatingGroupsEditIndexFulfilled {
  group: string;
  index: number;
}

/**
 * Setting this keeps the component with the given componentId in the same viewport position after rendering
 * new content above it. Support for this is implemented in the 'NavigationButtons' component, such that the
 * component is visible on screen (in the same location) even if progressing to the next page fails, and
 * validation messages are displayed above the navigation buttons.
 */
export interface IComponentScrollPos {
  componentId: string;
  offsetTop: number | undefined;
}

export interface IHiddenLayoutsUpdate {
  hiddenLayouts: string[];
}

export interface IInitRepeatingGroups {
  changedFields?: IFormData;
}

export interface IRepGroupAddRow {
  groupId: string;
  currentPageId?: string;
}

export interface IRepGroupDelRow {
  groupId: string;
  index: number;
  currentPageId: string | undefined;
}
