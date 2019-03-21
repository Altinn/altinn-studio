import { Action } from 'redux';
import * as actionTypes from '../types';

export interface IFetchFormLayout extends Action {
  url: string;
}

export function fetchFormLayout(url: string): IFetchFormLayout {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT,
    url,
  };
}

export interface IFetchFormLayoutFulfilled extends Action {
  formLayout: any;
}

export function fetchFormLayoutFulfilled(formLayout: any): IFetchFormLayoutFulfilled {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_FULFILLED,
    formLayout,
  };
}

export interface IFetchFormLayoutRejected extends Action {
  error: Error;
}

export function fetchFormLayoutRejected(error: Error): IFetchFormLayoutRejected {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_REJECTED,
    error,
  };
}