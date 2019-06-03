import { Action } from 'redux';
import * as actionTypes from '../types';

export interface IUpdateFormData extends Action {
  field: string;
  data: any;
  componentId: string;
}

export function updateFormData(field: string, data: any, componentId: string): IUpdateFormData {
  return {
    type: actionTypes.UPDATE_FORM_DATA,
    field,
    data,
    componentId,
  };
}

export interface IUpdateFormDataFulfilled extends Action {
  field: string;
  data: any;
}

export function updateFormDataFulfilled(field: string, data: any): IUpdateFormDataFulfilled {
  return {
    type: actionTypes.UPDATE_FORM_DATA_FULFILLED,
    field,
    data,
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
