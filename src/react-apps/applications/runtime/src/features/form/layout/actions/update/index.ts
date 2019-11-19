import { Action } from 'redux';
import { ILayoutComponent, ILayoutGroup } from '../..';
import { 
  UPDATE_FOCUS,
  UPDATE_FOCUS_FULFUILLED,
  UPDATE_FOCUS_REJECTED,
  UPDATE_FORM_LAYOUT,
  UPDATE_HIDDEN_COMPONENTS,
} from '../types';

export interface IUpdateFocus extends Action {
  currentComponentId: string;
  back?: boolean;
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

export function updateHiddenComponents(componentsToHide: string[]): IUpdateHiddenComponents {
  return ({
    type: UPDATE_HIDDEN_COMPONENTS,
    componentsToHide,
  });
}

export function updateFocus(currentComponentId: string, back?: boolean): IUpdateFocus {
  return ({
    type: UPDATE_FOCUS,
    currentComponentId,
    back,
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
