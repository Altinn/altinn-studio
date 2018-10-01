import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteComponentAction extends Action {
  id: string;
}

export interface IDeleteComponentActionFulfilled extends Action {
  id: string;
}

export interface IDeleteComponentActionRejected extends Action {
  error: Error;
}

export function deleteComponentAction(id: string): IDeleteComponentAction {
  return {
    type: ActionTypes.DELETE_FORM_COMPONENT,
    id,
  };
}

export function deleteComponentActionFulfilled(id: string): IDeleteComponentActionFulfilled {
  return {
    type: ActionTypes.DELETE_FORM_COMPONENT_FULFILLED,
    id,
  };
}

export function deleteComponentActionRejected(error: Error): IDeleteComponentActionRejected {
  return {
    type: ActionTypes.DELETE_FORM_COMPONENT_REJECTED,
    error,
  };
}
