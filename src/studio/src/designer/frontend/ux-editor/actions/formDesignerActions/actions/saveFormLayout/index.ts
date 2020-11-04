import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface ISaveFormLayoutRejectedAction extends Action {
  error: Error;
}

export function saveFormLayoutAction(): Action {
  return {
    type: ActionTypes.SAVE_FORM_LAYOUT,
  };
}

export function saveFormLayoutActionFulfilled(): Action {
  return {
    type: ActionTypes.SAVE_FORM_LAYOUT_FULFILLED,
  };
}

export function saveFormLayoutActionRejected(
  error: Error,
): ISaveFormLayoutRejectedAction {
  return {
    type: ActionTypes.SAVE_FORM_LAYOUT_REJECTED,
    error,
  };
}
