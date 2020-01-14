import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateFormContainerAction extends Action {
  updatedContainer: any;
  id: string;
}

export interface IUpdateFormContainerActionFulfilled extends Action {
  updatedContainer: any;
  id: string;
}

export interface IUpdateFormContainerActionRejected extends Action {
  error: Error;
}
export interface IToggleFormContainerRepeatAction extends Action {
  id: string;
}

export function updateFormContainerAction(updatedContainer: any, id: string): IUpdateFormContainerAction {
  return {
    type: ActionTypes.UPDATE_FORM_CONTAINER,
    updatedContainer,
    id,
  };
}

export function updateFormContainerActionFulfilled(updatedContainer: any, id: string):
  IUpdateFormContainerActionFulfilled {
  return {
    type: ActionTypes.UPDATE_FORM_CONTAINER_FULFILLED,
    updatedContainer,
    id,
  };
}

export function updateFormContainerActionRejected(error: Error): IUpdateFormContainerActionRejected {
  return {
    type: ActionTypes.UPDATE_FORM_CONTAINER_REJECTED,
    error,
  };
}

export function toggleFormContainerRepeatAction(id: string): IToggleFormContainerRepeatAction {
  return {
    type: ActionTypes.TOGGLE_FORM_CONTAINER_REPEAT,
    id,
  };
}
