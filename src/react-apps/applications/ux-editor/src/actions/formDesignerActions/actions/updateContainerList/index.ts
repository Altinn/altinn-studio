import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateContainerListAction extends Action {
  listItem: any;
  containerList: Array<any>;
}
export interface IUpdateContainerListActionFulfilled extends Action {
  containerList: Array<any>;
}
export interface IUpdateContainerListActionRejected extends Action {
  error: Error;
}

export interface IUpdateActiveListOrderAction extends Action {
  listItem: any;
  containerList: Array<any>;
}
export interface IUpdateActiveListOrderActionFulfilled extends Action {
  containerList: Array<any>;
}
export interface IUpdateActiveListOrderActionRejected extends Action {
  error: Error;
}

export function updateContainerListAction(
  listItem: any,
  containerList: Array<any>,
): IUpdateContainerListAction {
  return {
    type: ActionTypes.UPDATE_CONTAINER_LIST,
    listItem,
    containerList,
  };
}
export function updateContainerListActionFulfilled(
  containerList: Array<any>,
): IUpdateContainerListActionFulfilled {
  return {
    type: ActionTypes.UPDATE_CONTAINER_LIST_FULFILLED,
    containerList,
  };
}
export function updateContainerListActionRejected(
  error: Error,
): IUpdateContainerListActionRejected {
  return {
    type: ActionTypes.UPDATE_CONTAINER_LIST_REJECTED,
    error,
  };
}

export function updateActiveListOrderAction(
  listItem: any,
  containerList: Array<any>,
): IUpdateActiveListOrderAction {
  return {
    type: ActionTypes.UPDATE_ACTIVE_LIST_ORDER,
    listItem,
    containerList,
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
