import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateFormComponentIdAction extends Action {
  currentId: string;
  newId: string;
}

export interface IUpdateFormComponentIdFulfilledAction extends Action {
  currentId: string;
  newId: string;
}

export interface IUpdateFormComponentIdRejectedAction extends Action {
  error: Error;
}

export function updateFormComponentIdAction(currentId: string, newId: string):
  IUpdateFormComponentIdAction {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_ID,
    currentId,
    newId,
  };
}

export function updateFormComponentIdFulfilledAction(currentId: string, newId: string):
  IUpdateFormComponentIdFulfilledAction {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_ID_FULFILLED,
    currentId,
    newId,
  };
}

export function updateFormComponentIdRejectedAction(error: Error): IUpdateFormComponentIdRejectedAction {
  return {
    type: ActionTypes.UPDATE_FORM_COMPONENT_ID_REJECTED,
    error,
  };
}
