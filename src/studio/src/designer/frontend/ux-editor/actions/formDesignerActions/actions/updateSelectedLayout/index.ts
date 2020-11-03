import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateSelectedLayoutAction extends Action {
  selectedLayout: string;
}

export interface IUpdateSelectedLayoutFulfilledAction extends Action {
  selectedLayout: string;

}

export interface IUpdateSelectedLayoutRejectedAction extends Action {
  error: Error;
}

export function updateSelectedLayout(selectedLayout: string): IUpdateSelectedLayoutAction {
  return {
    type: ActionTypes.UPDATE_SELECTED_LAYOUT,
    selectedLayout,
  };
}

export function updateSelectedLayoutFulfilled(selectedLayout: string):
  IUpdateSelectedLayoutFulfilledAction {
  return {
    type: ActionTypes.UPDATE_SELECTED_LAYOUT_FULFILLED,
    selectedLayout,
  };
}

export function updateSelectedLayoutRejected(error: Error): IUpdateSelectedLayoutRejectedAction {
  return {
    type: ActionTypes.UPDATE_SELECTED_LAYOUT_REJECTED,
    error,
  };
}
