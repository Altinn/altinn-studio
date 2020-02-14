import { Action } from 'redux';
import * as ActionTypes from './fetchFormDatamodelActionTypes';

export interface IFetchDataModel extends Action {
  url: string;
}

export interface IFetchDataModelFulfilled extends Action {
  dataModel: any;
}

export interface IFetchDataModelRejected extends Action {
  error: Error;
}

export function fetchDataModel(url: string): IFetchDataModel {
  return {
    type: ActionTypes.FETCH_DATA_MODEL,
    url,
  };
}

export function fetchDataModelFulfilled(dataModel: any): IFetchDataModelFulfilled {
  return {
    type: ActionTypes.FETCH_DATA_MODEL_FULFILLED,
    dataModel,
  };
}

export function fetchDataModelRejected(error: Error): IFetchDataModelRejected {
  return {
    type: ActionTypes.FETCH_DATA_MODEL_REJECTED,
    error,
  };
}
