import { Action } from 'redux';
import { ILayoutComponent, ILayoutGroup } from '..';
import {
  UPDATE_FOCUS,
  UPDATE_FOCUS_FULFUILLED,
  UPDATE_FOCUS_REJECTED,
  UPDATE_FORM_LAYOUT,
  UPDATE_HIDDEN_COMPONENTS,
  UPDATE_AUTO_SAVE,
  UPDATE_AUTO_SAVE_FULFILLED,
  UPDATE_AUTO_SAVE_REJECTED,
} from '../formLayoutActionTypes';

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

export interface IUpdateFormLayout extends Action {
  layoutElement: ILayoutGroup | ILayoutComponent;
  index: number;
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

export function updateFormLayout(layoutElement: ILayoutComponent | ILayoutGroup, index: number): IUpdateFormLayout {
  return ({
    type: UPDATE_FORM_LAYOUT,
    layoutElement,
    index,
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
