/* eslint-disable max-len */
import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteComponentsAction extends Action {
  components: string[];
}

export interface IDeleteComponentActionFulfilled extends Action {
  id: string;
  containerId: string;
}

export interface IDeleteComponentsActionRejected extends Action {
  error: Error;
}

export function deleteComponentAction(components: string[]): IDeleteComponentsAction {
  return {
    type: ActionTypes.DELETE_FORM_COMPONENTS,
    components,
  };
}

export function deleteComponentActionFulfilled(id: string, containerId: string): IDeleteComponentActionFulfilled {
  return {
    type: ActionTypes.DELETE_FORM_COMPONENT_FULFILLED,
    id,
    containerId,
  };
}

export function deleteComponentActionRejected(error: Error): IDeleteComponentsActionRejected {
  return {
    type: ActionTypes.DELETE_FORM_COMPONENTS_REJECTED,
    error,
  };
}
