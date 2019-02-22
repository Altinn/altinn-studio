import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface ICompleteAndSendInForm extends Action {
  url: string;
}

export function completeAndSendInForm(url: string): ICompleteAndSendInForm {
  return {
    type: ActionTypes.COMPLETE_AND_SEND_IN_FORM,
    url,
  };
}

export function completeAndSendInFormFulfilled(): Action {
  return {
    type: ActionTypes.COMPLETE_AND_SEND_IN_FORM_FULFILLED,
  };
}

export function completeAndSendInFormRejected(): Action {
  return {
    type: ActionTypes.COMPLETE_AND_SEND_IN_FORM_REJECTED,
  };
}
