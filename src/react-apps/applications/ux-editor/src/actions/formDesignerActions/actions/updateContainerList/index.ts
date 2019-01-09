import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateActiveListAction extends Action {
  listItem: any;
  containerList: any;
}
export interface IUpdateActiveListActionFulfilled extends Action {
  containerList: any;
}
export interface IUpdateActiveListActionRejected extends Action {
  error: Error;
}

export interface IUpdateActiveListOrderAction extends Action {
  containerList: any;
  orderList: any[];
}
export interface IUpdateActiveListOrderActionFulfilled extends Action {
  containerList: any;
}
export interface IUpdateActiveListOrderActionRejected extends Action {
  error: Error;
}

export interface IDeleteActiveListActionRejected extends Action {
  error: Error;
}

export function updateActiveListAction(
  listItem: any,
  containerList: any,
): IUpdateActiveListAction {
  return {
    type: ActionTypes.UPDATE_ACTIVE_LIST,
    listItem,
    containerList,
  };
}
export function updateActiveListActionFulfilled(
  containerList: any,
): IUpdateActiveListActionFulfilled {
  return {
    type: ActionTypes.UPDATE_ACTIVE_LIST_FULFILLED,
    containerList,
  };
}
export function updateActiveListActionRejected(
  error: Error,
): IUpdateActiveListActionRejected {
  return {
    type: ActionTypes.UPDATE_ACTIVE_LIST_REJECTED,
    error,
  };
}

export function updateActiveListOrderAction(
  containerList: any,
  orderList: any[],
): IUpdateActiveListOrderAction {
  return {
    containerList,
    orderList,
    type: ActionTypes.UPDATE_ACTIVE_LIST_ORDER,
  };
}
export function updateActiveListOrderActionFulfilled(
  containerList: any,
): IUpdateActiveListOrderActionFulfilled {
  return {
    type: ActionTypes.UPDATE_ACTIVE_LIST_ORDER_FULFILLED,
    containerList,
  };
}
export function updateActiveListOrderActionRejected(
  error: Error,
): IUpdateActiveListOrderActionRejected {
  return {
    type: ActionTypes.UPDATE_ACTIVE_LIST_ORDER_REJECTED,
    error,
  };
}
export function deleteActiveListAction(
): Action {
  return {
    type: ActionTypes.DELETE_ACTIVE_LIST,
  };
}
export function deleteActiveListActionFulfilled(
): Action {
  return {
    type: ActionTypes.DELETE_ACTIVE_LIST_FULFILLED,
  };
}
export function deleteActiveListActionRejected(
  error: Error,
): IUpdateActiveListOrderActionRejected {
  return {
    type: ActionTypes.DELETE_ACTIVE_LIST_REJECTED,
    error,
  };
}
