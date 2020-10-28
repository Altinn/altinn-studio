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

export interface ISetCurrentSingleFieldValidationAction extends Action {
  dataModelBinding?: string;
}

export function runSingleFieldValidationAction(): IRunSingleFieldValidationAction {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION,
  };
}

export function setCurrentSingleFieldValidationAction(
  dataModelBinding?: string,
): ISetCurrentSingleFieldValidationAction {
  return {
    type: ActionTypes.SET_CURRENT_SINGLE_FIELD_VALIDATION,
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
