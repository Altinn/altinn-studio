import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface ISubmitFormDataAction extends Action {
  url: string;
}

export interface ISubmitFormDataActionRejected extends Action {
  error: Error;
}

export function submitFormDataAction(url: string): ISubmitFormDataAction {
  return {
    type: ActionTypes.SUBMIT_FORM_DATA,
    url,
  };
}

export function submitFormDataActionFulfilled(): Action {
  return {
    type: ActionTypes.SUBMIT_FORM_DATA_FULFILLED,
  };
}

export function submitFormDataActionRejected(error: Error): ISubmitFormDataActionRejected {
  return {
    type: ActionTypes.SUBMIT_FORM_DATA_REJECTED,
    error,
  };
}
