import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface ISubmitFormDataAction extends Action {
  url: string;
  apiMode?: string;
}

export interface ISubmitFormDataActionRejected extends Action {
  error: Error;
}

export interface ISubmitFormDataActionFulfilled extends Action {
  apiResult: any;
}

export function submitFormDataAction(url: string, apiMode?: string): ISubmitFormDataAction {
  return {
    type: ActionTypes.SUBMIT_FORM_DATA,
    url,
    apiMode,
  };
}

export function submitFormDataActionFulfilled(apiResult: any): ISubmitFormDataActionFulfilled {
  return {
    type: ActionTypes.SUBMIT_FORM_DATA_FULFILLED,
    apiResult,
  };
}

export function submitFormDataActionRejected(error: Error): ISubmitFormDataActionRejected {
  return {
    type: ActionTypes.SUBMIT_FORM_DATA_REJECTED,
    error,
  };
}
