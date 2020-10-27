import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateLayoutOrderAction extends Action {
  layout: string;
  direction: 'up' | 'down';
}

export interface IUpdateLayoutOrderFulfilledAction extends Action {
  layout: string;
  direction: 'up' | 'down';

}

export interface IUpdateLayoutOrderRejectedAction extends Action {
  error: Error;
}

export function updateLayoutOrder(layout: string, direction: 'up' | 'down'): IUpdateLayoutOrderAction {
  return {
    type: ActionTypes.UPDATE_LAYOUT_ORDER,
    layout,
    direction,
  };
}

export function updateLayoutOrderFulfilled(layout: string, direction: 'up' | 'down'):
  IUpdateLayoutOrderFulfilledAction {
  return {
    type: ActionTypes.UPDATE_LAYOUT_ORDER_FULFILLED,
    layout,
    direction,
  };
}

export function updateLayoutOrderRejected(error: Error): IUpdateLayoutOrderRejectedAction {
  return {
    type: ActionTypes.UPDATE_LAYOUT_ORDER_REJECTED,
    error,
  };
}
