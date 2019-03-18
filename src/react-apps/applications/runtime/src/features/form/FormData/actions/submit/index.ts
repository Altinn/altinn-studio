import { Action } from 'redux';
import * as actionTypes from '../types';

export function submitFormData(): Action {
  return {
    type: actionTypes.SUBMIT_FORM_DATA,
  };
}

export function submitFormDataFulfilled(): Action {
  return {
    type: actionTypes.SUBMIT_FORM_DATA_FULFILLED,
  };
}

export interface ISubmitFormDataRejected extends Action {
  error: Error;
}

export function submitFormDataRejected(error: Error): ISubmitFormDataRejected {
  return {
    type: actionTypes.SUBMIT_FORM_DATA_REJECTED,
    error,
  };
}