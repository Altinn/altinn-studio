import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';
import { IUpdateValidationResults } from '../updateFormData';

export interface IFetchFormDataAction extends Action {
  url: string;
}

export interface IFetchFormDataActionFulfilled extends Action {
  formData: any;
}

export interface IFetchFormDataActionRejected extends Action {
  error: Error;
}

export function fetchFormDataAction(url: string): IFetchFormDataAction {
  return {
    type: ActionTypes.FETCH_FORM_DATA,
    url,
  };
}

export function fetchFormDataActionFulfilled(formData: any): IFetchFormDataActionFulfilled {
  return {
    type: ActionTypes.FETCH_FORM_DATA_FULFILLED,
    formData,
  };
}

export function fetchFormDataActionRejected(error: Error): IFetchFormDataActionRejected {
  return {
    type: ActionTypes.FETCH_FORM_DATA_REJECTED,
    error,
  };
}

export function updateValidationErrors(validationErrors: {}): IUpdateValidationResults {
  return {
    type: ActionTypes.UPDATE_VALIDATION_ERRORS,
    validationResults: validationErrors,
  };
}
