import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateActiveListAction extends Action {
  listItem: any;
  containerList: Array<any>;
}
export interface IUpdateActiveListActionFulfilled extends Action {
  containerList: Array<any>;
}
export interface IUpdateActiveListActionRejected extends Action {
  error: Error;
}

export interface IUpdateActiveListOrderAction extends Action {
  containerList: Array<any>;
}
export interface IUpdateActiveListOrderActionFulfilled extends Action {
  containerList: Array<any>;
}
export interface IUpdateActiveListOrderActionRejected extends Action {
  error: Error;
}

export interface IDeleteActiveListAction extends Action {
}

export interface IDeleteActiveListActionFulfilled extends Action {
}

export interface IDeleteActiveListActionRejected extends Action {
  error: Error;
}

export function updateActiveListAction(
  listItem: any,
  containerList: Array<any>,
): IUpdateActiveListAction {
  return {
    type: ActionTypes.UPDATE_CONTAINER_LIST,
    listItem,
    containerList,
  };
}
export function updateActiveListActionFulfilled(
  containerList: Array<any>,
): IUpdateActiveListActionFulfilled {
  return {
    type: ActionTypes.UPDATE_CONTAINER_LIST_FULFILLED,
    containerList,
  };
}
export function updateActiveListActionRejected(
  error: Error,
): IUpdateActiveListActionRejected {
  return {
    type: ActionTypes.UPDATE_CONTAINER_LIST_REJECTED,
    error,
  };
}

export function updateActiveListOrderAction(
  containerList: Array<any>,
): IUpdateActiveListOrderAction {
  return {
    containerList,
    type: ActionTypes.UPDATE_ACTIVE_LIST_ORDER,
  };
}
export function updateActiveListOrderActionFulfilled(
  containerList: Array<any>,
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
): IDeleteActiveListAction {
  return {
    type: ActionTypes.DELETE_ACTIVE_LIST,
  };
}
export function deleteActiveListActionFulfilled(
): IDeleteActiveListActionFulfilled {
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
