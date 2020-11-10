import { Action } from 'redux';
import * as ActionTypes from './dataModelingActionTypes';

export interface IFetchDataModelAction extends Action {
  url: string;
}

export interface IFetchDataModelFulfilled extends Action {
  schema: any;
}

export interface IFetchDataModelRejected extends Action {
  error: Error;
}

export interface ISaveDataModelAction extends Action {
  url: string;
  schema: any;
}

export interface ISaveDataModelRejected extends Action {
  error: Error;
}

export interface ISetDataModelFilePath extends Action {
  filePath: string;
}

export function fetchDataModelAction(url: string): IFetchDataModelAction {
  return {
    type: ActionTypes.FETCH_DATA_MODEL,
    url,
  };
}

export function fetchDataModelFulfilledAction(schema: any): IFetchDataModelFulfilled {
  return {
    type: ActionTypes.FETCH_DATA_MODEL_FULFILLED,
    schema,
  };
}

export function fetchDataModelRejectedAction(error: Error): IFetchDataModelRejected {
  return {
    type: ActionTypes.FETCH_DATA_MODEL_REJECTED,
    error,
  };
}

export function saveDataModelAction(url: string, schema: any): ISaveDataModelAction {
  return {
    type: ActionTypes.SAVE_DATA_MODEL,
    url,
    schema,
  };
}

export function saveDataModelFulfilledAction(): Action {
  return {
    type: ActionTypes.SAVE_DATA_MODEL_FULFILLED,
  };
}

export function saveDataModelRejectedAction(error: Error): ISaveDataModelRejected {
  return {
    type: ActionTypes.SAVE_DATA_MODEL_REJECTED,
    error,
  };
}

export function setDataModelFilePath(filePath: string): ISetDataModelFilePath {
  return {
    type: ActionTypes.SET_DATA_MODEL_FILE_PATH,
    filePath,
  };
}
