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
