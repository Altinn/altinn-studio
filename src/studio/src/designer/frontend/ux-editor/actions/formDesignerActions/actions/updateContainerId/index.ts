import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateContainerIdAction extends Action {
  currentId: string;
  newId: string;
}

export interface IUpdateContainerIdFulfilled extends Action {
  currentId: string;
  newId: string;
}

export interface IUpdateContainerIdRejectedAction extends Action {
  error: Error;
}

export function updateContainerId(
  currentId: string,
  newId: string,
): IUpdateContainerIdAction {
  return {
    type: ActionTypes.UPDATE_CONTAINER_ID,
    currentId,
    newId,
  };
}

export function updateContainerIdFulfilled(
  currentId: string,
  newId: string,
): IUpdateContainerIdFulfilled {
  return {
    type: ActionTypes.UPDATE_CONTAINER_ID_FULFILLED,
    currentId,
    newId,
  };
}

export function updateContainerIdRejected(error: Error): IUpdateContainerIdRejectedAction {
  return {
    type: ActionTypes.UPDATE_CONTAINER_ID_REJECTED,
    error,
  };
}
