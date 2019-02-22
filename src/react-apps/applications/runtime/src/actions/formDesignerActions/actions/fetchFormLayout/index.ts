import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IFetchFormLayoutAction extends Action {
  url: string;
}

export interface IFetchFormLayoutFulfilledAction extends Action {
  formLayout: IFormDesignerLayout;
}

export interface IFetchFormLayoutRejectedAction extends Action {
  error: Error;
}

export function fetchFormLayout(url: string): IFetchFormLayoutAction {
  return {
    type: ActionTypes.FETCH_FORM_LAYOUT,
    url,
  };
}
export function fetchFormLayoutFulfilled(
  formLayout: IFormDesignerLayout,
): IFetchFormLayoutFulfilledAction {
  return {
    type: ActionTypes.FETCH_FORM_LAYOUT_FULFILLED,
    formLayout,
  };
}

export function fetchFormLayoutRejected(
  error: Error,
): IFetchFormLayoutRejectedAction {
  return {
    type: ActionTypes.FETCH_FORM_LAYOUT_REJECTED,
    error,
  };
}
