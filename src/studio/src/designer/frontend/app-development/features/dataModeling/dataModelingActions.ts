import { Action } from 'redux';
import * as ActionTypes from './dataModelingActionTypes';

export interface IFetchDataModelFulfilled extends Action {
  schema: any;
}

export interface IFetchDataModelRejected extends Action {
  error: Error;
}

export interface ISaveDataModelAction extends Action {
  schema: any;
}

export interface ISaveDataModelRejected extends Action {
  error: Error;
}

export interface ISetDataModelFilePath extends Action {
  filePath: string;
}

export function fetchDataModelAction(): Action {
  return {
    type: ActionTypes.FETCH_DATA_MODEL,
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

export function saveDataModelAction(schema: any): ISaveDataModelAction {
  return {
    type: ActionTypes.SAVE_DATA_MODEL,
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
