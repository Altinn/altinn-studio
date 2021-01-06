import { Action } from 'redux';
import * as actionTypes from '../formDataActionTypes';

export interface ISubmitDataAction extends Action {
  url: string;
  apiMode?: string;
  stopWithWarnings?: boolean;
}

export function saveFormdata(): Action {
  return {
    type: actionTypes.SAVE_FORM_DATA,
  };
}

export function submitFormData(url: string, apiMode?: string, stopWithWarnings?: boolean): ISubmitDataAction {
  return {
    type: actionTypes.SUBMIT_FORM_DATA,
    url,
    apiMode,
    stopWithWarnings,
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
