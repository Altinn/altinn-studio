import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateFormComponentAction extends Action {
  updatedComponent: any;
  id: string;
  activeContainer?: string;
}

export interface IUpdateFormComponentActionFulfilled extends Action {
  updatedComponent: any;
  id: string;
}

export interface IUpdateFormComponentActionRejected extends Action {
  error: Error;
}

export function updateFormComponentAction(
  updatedComponent: any,
  id: string,
  activeContainer?: string,
): IUpdateFormComponentAction {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT,
    updatedComponent,
    id,
    activeContainer,
  };
}

export function updateFormComponentActionFulfilled(updatedComponent: any, id: string):
  IUpdateFormComponentActionFulfilled {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_FULFILLED,
    updatedComponent,
    id,
  };
}

export function updateFormComponentActionRejected(error: Error): IUpdateFormComponentActionRejected {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_REJECTED,
    error,
  };
}
