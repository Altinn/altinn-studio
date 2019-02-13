import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface IRunSingleFieldValidationAction extends Action {
  url: string;
  dataModelBinding?: string;
}

export interface IRunSingleFieldValidationActionRejected extends Action {
  error: Error;
}

export interface IRunSingleFieldValidationActionFulfilled extends Action {
  validationResult: any;
}

export function runSingleFieldValidationAction(
  url: string,
  dataModelBinding?: string,
): IRunSingleFieldValidationAction {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION,
    url,
    dataModelBinding,
  };
}

export function runSingleFieldValidationActionFulfilled(
  validationResult: any,
): IRunSingleFieldValidationActionFulfilled {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION_FULFILLED,
    validationResult,
  };
}

export function runSingleFieldValidationActionRejected(error: Error): IRunSingleFieldValidationActionRejected {
  return {
    type: ActionTypes.RUN_SINGLE_FIELD_VALIDATION_REJECTED,
    error,
  };
}
