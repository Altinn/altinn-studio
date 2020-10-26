import { Action } from 'redux';
import * as ActionTypes from '../validationActionTypes';

export interface IRunSingleFieldValidationAction extends Action {
  dataModelBinding?: string;
}

export interface IRunSingleFieldValidationActionRejected extends Action {
  error: Error;
}

export interface IRunSingleFieldValidationActionFulfilled extends Action {
  validations: any;
}

export function runSingleFieldValidationAction(
  dataModelBinding?: string,
): IRunSingleFieldValidationAction {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION,
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
