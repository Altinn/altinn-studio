import { Action } from 'redux';
import * as actionTypes from '../types';

export interface IFetchFormData extends Action {
  url: string;
}

export interface IFetchFormDataFulfilled extends Action {
  formData: any;
}

export interface IFetchFormDataRejected extends Action {
  error: Error;
}

export function fetchFormData(url: string): IFetchFormData {
  return {
    type: actionTypes.FETCH_FORM_DATA,
    url,
  };
}

export function fetchFormDataFulfilled(formData: any): IFetchFormDataFulfilled {
  return {
    type: actionTypes.FETCH_FORM_DATA_FULFILLED,
    formData,
  };
}

export function fetchFormDataRejected(error: Error): IFetchFormDataRejected {
  return {
    type: actionTypes.FETCH_FORM_DATA_REJECTED,
    error,
  };
}

export function fetchFormDataInitial(): Action {
  return {
    type: actionTypes.FETCH_FORM_DATA_INITIAL,
  };
}
