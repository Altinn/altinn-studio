import { Action } from 'redux';
import * as ActionTypes from '../validationActionTypes';

export interface IRunSingleFieldValidationAction extends Action {
}

export interface IRunSingleFieldValidationActionRejected extends Action {
  error: Error;
}

export interface IRunSingleFieldValidationActionFulfilled extends Action {
  validations: any;
}

export interface ISetCurrentDataModelBindingAction extends Action {
  dataModelBinding?: string;
}

export function runSingleFieldValidationAction(
  dataModelBinding?: string,
): IRunSingleFieldValidationAction {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION,
  };
}

export function setCurrentDataModelBindingAction(
  dataModelBinding?: string,
): ISetCurrentDataModelBindingAction {
  return {
    type: ActionTypes.SET_CURRENT_DATA_MODEL_BINDING,
    dataModelBinding,
  };
}

export function runSingleFieldValidationActionFulfilled(
  validations: any,
): IRunSingleFieldValidationActionFulfilled {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION_FULFILLED,
    validations,
  };
}

export function runSingleFieldValidationActionRejected(error: Error): IRunSingleFieldValidationActionRejected {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION_REJECTED,
    error,
  };
}
