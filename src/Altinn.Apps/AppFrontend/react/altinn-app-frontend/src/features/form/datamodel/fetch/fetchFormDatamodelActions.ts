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

export interface IFetchJsonSchemaFulfilled extends Action {
  schema: any;
  id: any;
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

export function fetchJsonSchema(): Action {
  return {
    type: ActionTypes.FETCH_JSON_SCHEMA,
  };
}

export function fetchJsonSchemaFulfilled(schema: any, id: string): IFetchJsonSchemaFulfilled {
  return {
    type: ActionTypes.FETCH_JSON_SCHEMA_FULFILLED,
    schema,
    id,
  };
}

export function fetchJsonSchemaRejected(error: Error): IFetchDataModelRejected {
  return {
    type: ActionTypes.FETCH_JSON_SCHEMA_REJECTED,
    error,
  };
}
