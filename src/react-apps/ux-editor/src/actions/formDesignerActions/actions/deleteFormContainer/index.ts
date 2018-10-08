import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteContainerAction extends Action {
  id: string;
}

export interface IDeleteContainerActionFulfilled extends Action {
  id: string;
}

export interface IDeleteContainerActionRejected extends Action {
  error: Error;
}

export function deleteContainerAction(id: string): IDeleteContainerAction {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER,
    id,
  };
}

export function deleteContainerActionFulfilled(id: string): IDeleteContainerActionFulfilled {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER_FULFILLED,
    id,
  };
}

export function deleteContainerActionRejected(error: Error): IDeleteContainerActionRejected {
  return {
    type: ActionTypes.DELETE_FORM_CONTAINER_REJECTED,
    error,
  };
}
