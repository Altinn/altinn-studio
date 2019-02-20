import { Action } from 'redux';
import * as ActionTypes from '../../manageServiceConfigurationActionTypes';

export interface IFetchJsonFileAction extends Action {
  url: string;
}

export interface IFetchJsonFileFulfilledAction extends Action {
  data: any;
}

export interface IFetchJsonFileRejectedAction extends Action {
  error: Error;
}

export function FetchJsonFile(url: string): IFetchJsonFileAction {
  return {
    type: ActionTypes.FETCH_JSON_FILE,
    url,
  };
}

export function FetchJsonFileFulfilled(data: any): IFetchJsonFileFulfilledAction {
  return {
    type: ActionTypes.FETCH_JSON_FILE_FULFILLED,
    data,
  };
}

export function FetchJsonFileRejected(error: Error): IFetchJsonFileRejectedAction {
  return {
    type: ActionTypes.FETCH_JSON_FILE_REJECTED,
    error,
  };
}
