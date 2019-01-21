import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteContainerAction extends Action {
  id: string;
  index?: number;
  parentContainerId?: string;
}

export interface IDeleteContainerActionFulfilled extends Action {
  id: string;
  index?: number;
  parentContainerId?: string;
}

export interface IDeleteContainerActionRejected extends Action {
  error: Error;
}

export function deleteContainerAction(id: string, index?: number, parentContainerId?: string): IDeleteContainerAction {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER,
    id,
    index,
    parentContainerId,
  };
}

export function deleteContainerActionFulfilled(id: string, index?: number, parentContainerId?: string):
  IDeleteContainerActionFulfilled {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER_FULFILLED,
    id,
    index,
    parentContainerId,
  };
}

export function deleteContainerActionRejected(error: Error): IDeleteContainerActionRejected {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER_REJECTED,
    error,
  };
}
