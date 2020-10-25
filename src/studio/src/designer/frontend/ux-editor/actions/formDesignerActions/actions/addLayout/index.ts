/* eslint-disable no-undef */
import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddLayoutAction extends Action {
  layout: string;
}

export interface IAddLayoutFulfilledAction extends Action {
  layouts: IFormLayouts;
}

export interface IAddLayoutRejectedAction extends Action {
  error: Error;
}

export function addLayout(layout: string): IAddLayoutAction {
  return {
    type: ActionTypes.ADD_LAYOUT,
    layout,
  };
}

export function addLayoutFulfilled(layouts: IFormLayouts):
  IAddLayoutFulfilledAction {
  return {
    type: ActionTypes.ADD_LAYOUT_FULFILLED,
    layouts,
  };
}

export function addLayoutRejected(error: Error): IAddLayoutRejectedAction {
  return {
    type: ActionTypes.ADD_LAYOUT_REJECTED,
    error,
  };
}
