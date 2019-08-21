import { Action } from 'redux';
import * as actionTypes from '../types';

export interface ICompleteAndSendInForm extends Action {
  url: string;
}

export function completeAndSendInForm(url: string): ICompleteAndSendInForm {
  return {
    type: actionTypes.COMPLETE_AND_SEND_IN_FORM,
    url,
  };
}

export interface ICompleteAndSendInFormFulfilled extends Action {
  response: any;
}

export function completeAndSendInFormFulfilled(response: any): ICompleteAndSendInFormFulfilled {
  return {
    type: actionTypes.COMPLETE_AND_SEND_IN_FORM_FULFILLED,
    response,
  };
}

export interface ICompleteAndSendInFormRejected extends Action {
  error: Error;
}

export function completeAndSendInFormRejected(error: Error): ICompleteAndSendInFormRejected {
  return {
    type: actionTypes.COMPLETE_AND_SEND_IN_FORM_REJECTED,
    error,
  };
}
