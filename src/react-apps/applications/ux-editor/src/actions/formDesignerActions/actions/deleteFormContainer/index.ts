import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteContainerAction extends Action {
  id: string;
  index?: number;
}

export interface IDeleteContainerActionFulfilled extends Action {
  id: string;
  index?: number;
}

export interface IDeleteContainerActionRejected extends Action {
  error: Error;
}

export function deleteContainerAction(id: string, index?: number): IDeleteContainerAction {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER,
    id,
    index,
  };
}

export function deleteContainerActionFulfilled(id: string, index?: number): IDeleteContainerActionFulfilled {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER_FULFILLED,
    id,
    index,
  };
}

export function deleteContainerActionRejected(error: Error): IDeleteContainerActionRejected {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER_REJECTED,
    error,
  };
}
