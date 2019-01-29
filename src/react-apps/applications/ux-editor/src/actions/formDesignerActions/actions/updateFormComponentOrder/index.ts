import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateFormComponentOrderActionRejected extends Action {
  error: Error;
}

export interface IUpdateFormComponentOrderAction extends Action {
  updatedOrder: any;
}

export interface IUpdateFormComponentOrderActionFulfilled extends Action {
  updatedOrder: any;
}

export function updateFormComponentOrderActionFulfilled(updatedOrder: any):
  IUpdateFormComponentOrderActionFulfilled {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_ORDER_FULFILLED,
    updatedOrder,
  };
}

export function updateFormComponentOrderActionRejected(error: Error): IUpdateFormComponentOrderActionRejected {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_ORDER_REJECTED,
    error,
  };
}

export function updateFormComponentOrderAction(
  updatedOrder: any,
):
  IUpdateFormComponentOrderAction {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_ORDER,
    updatedOrder,
  };
}
