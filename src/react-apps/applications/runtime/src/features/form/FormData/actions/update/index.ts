import { Action } from 'redux';
import * as actionTypes from '../types';

export interface IUpdateFormData extends Action {
  field: string;
  data: any;
}

export function updateFormData(field: string, data: any): IUpdateFormData {
  return {
    type: actionTypes.UPDATE_FORM_DATA,
    field,
    data,
  };
}

export function updateFormDataFulfilled(): Action {
  return {
    type: actionTypes.UPDATE_FORM_DATA_FULFILLED,
  };
}

export interface IUpdateFormDataRejected extends Action {
  error: Error;
}

export function updateFormDataRejected(error: Error): IUpdateFormDataRejected {
  return {
    type: actionTypes.UPDATE_FORM_DATA_REJECTED,
    error,
  };
}