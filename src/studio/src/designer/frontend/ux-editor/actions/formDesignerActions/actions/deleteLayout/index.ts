import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteLayoutAction extends Action {
  layout: string;
}

export interface IDeleteLayoutFulfilledAction extends Action {
  layout: string;

}

export interface IDeleteLayoutRejectedAction extends Action {
  error: Error;
}

export function deleteLayout(layout: string): IDeleteLayoutAction {
  return {
    type: ActionTypes.DELETE_LAYOUT,
    layout,
  };
}

export function deleteLayoutFulfilled(selectedLayout: string):
  IDeleteLayoutFulfilledAction {
  return {
    type: ActionTypes.DELETE_LAYOUT_FULFILLED,
    layout: selectedLayout,
  };
}

export function deleteLayoutRejected(error: Error): IDeleteLayoutRejectedAction {
  return {
    type: ActionTypes.DELETE_LAYOUT_REJECTED,
    error,
  };
}
