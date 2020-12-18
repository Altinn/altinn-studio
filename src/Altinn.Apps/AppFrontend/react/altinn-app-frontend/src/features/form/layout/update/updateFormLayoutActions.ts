import { Action } from 'redux';
import { UPDATE_FOCUS,
  UPDATE_FOCUS_FULFUILLED,
  UPDATE_FOCUS_REJECTED,
  UPDATE_REPEATING_GROUPS,
  UPDATE_REPEATING_GROUPS_FULFILLED,
  UPDATE_REPEATING_GROUPS_REJECTED,
  UPDATE_HIDDEN_COMPONENTS,
  UPDATE_AUTO_SAVE,
  UPDATE_AUTO_SAVE_FULFILLED,
  UPDATE_AUTO_SAVE_REJECTED,
  UPDATE_CURRENT_VIEW,
  UPDATE_CURRENT_VIEW_FULFILLED,
  UPDATE_CURRENT_VIEW_REJECTED } from '../formLayoutActionTypes';

export interface IUpdateFocus extends Action {
  currentComponentId: string;
  step?: number;
}

export interface IUpdateFocusFulfilled extends Action {
  focusComponentId: string;
}

export interface IUpdateFocusRejected extends Action {
  error: Error;
}

export interface IUpdateRepeatingGroups extends Action {
  layoutElementId: string;
  remove?: boolean;
  index?: number;
}

export interface IUpdateRepeatingGroupsFulfilled extends Action {
  repeatingGroups: any;
}

export interface IUpdateRepeatingGroupsRejected extends Action {
  error: Error;
}

export interface IUpdateHiddenComponents extends Action {
  componentsToHide: string[];
}

export interface IUpdateHiddenComponentRejected extends Action {
  error: Error;
}

export interface IUpdateAutoSave extends Action {
  autoSave: boolean;
}

export interface IUpdateAutoSaveFulfilled extends Action {
  autoSave: boolean;
}

export interface IUpdateAutoSaveRejected extends Action {
  error: Error;
}

export interface IUpdateCurrentView extends Action {
  newView: string;
  runValidations?: 'allPages' | 'page';
}

export interface IUpdateCurrentViewFulfilled extends Action {
  newView: string;
}

export interface IUpdateCurrentViewRejected extends Action {
  error: Error;
}

export function updateHiddenComponents(componentsToHide: string[]): IUpdateHiddenComponents {
  return ({
    type: UPDATE_HIDDEN_COMPONENTS,
    componentsToHide,
  });
}

export function updateFocus(currentComponentId: string, step?: number): IUpdateFocus {
  return ({
    type: UPDATE_FOCUS,
    currentComponentId,
    step,
  });
}

export function updateFocusFulfilled(focusComponentId: string): IUpdateFocusFulfilled {
  return ({
    type: UPDATE_FOCUS_FULFUILLED,
    focusComponentId,
  });
}

export function updateFocusRejected(error: Error): IUpdateFocusRejected {
  return ({
    type: UPDATE_FOCUS_REJECTED,
    error,
  });
}

export function updateRepeatingGroups(
  layoutElementId: string,
  remove?: boolean,
  index?: number,
): IUpdateRepeatingGroups {
  return ({
    type: UPDATE_REPEATING_GROUPS,
    layoutElementId,
    remove,
    index,
  });
}

export function updateRepeatingGroupsFulfilled(
  repeatingGroups: any,
): IUpdateRepeatingGroupsFulfilled {
  return ({
    type: UPDATE_REPEATING_GROUPS_FULFILLED,
    repeatingGroups,
  });
}

export function updateRepeatingGroupsRejected(error: Error): IUpdateRepeatingGroupsRejected {
  return ({
    type: UPDATE_REPEATING_GROUPS_REJECTED,
    error,
  });
}

export function updateAutoSave(autoSave: boolean): IUpdateAutoSave {
  return ({
    type: UPDATE_AUTO_SAVE,
    autoSave,
  });
}

export function updateAutoSaveFulfilled(autoSave: boolean): IUpdateAutoSave {
  return ({
    type: UPDATE_AUTO_SAVE_FULFILLED,
    autoSave,
  });
}

export function updateAutoSaveRejected(error: Error): IUpdateAutoSaveRejected {
  return ({
    type: UPDATE_AUTO_SAVE_REJECTED,
    error,
  });
}

export function updateCurrentView(newView: string, runValidations?: 'allPages' | 'page'): IUpdateCurrentView {
  return ({
    type: UPDATE_CURRENT_VIEW,
    newView,
    runValidations,
  });
}

export function updateCurrentViewFulfilled(newView: string): IUpdateCurrentViewFulfilled {
  return ({
    type: UPDATE_CURRENT_VIEW_FULFILLED,
    newView,
  });
}

export function updateCurrentViewRejected(error: Error): IUpdateCurrentViewRejected {
  return ({
    type: UPDATE_CURRENT_VIEW_REJECTED,
    error,
  });
}
