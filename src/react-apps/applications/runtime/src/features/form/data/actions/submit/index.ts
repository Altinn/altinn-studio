import { Action } from 'redux';
import * as actionTypes from '../types';

export interface ISubmitDataAction extends Action {
  url: string;
  apiMode?: string;
}

export function submitFormData(url: string, apiMode?: string): ISubmitDataAction {
  return {
    type: actionTypes.SUBMIT_FORM_DATA,
    url,
    apiMode,
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
