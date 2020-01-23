import { Action } from 'redux';
import * as ActionTypes from '../../manageServiceConfigurationActionTypes';

export interface ISaveJsonFileAction extends Action {
  url: string;
}

export interface ISaveJsonFileFulfilledAction extends Action {
  data: any;
}

export interface ISaveJsonFileRejectedAction extends Action {
  error: Error;
}

export function SaveJsonFile(url: string): ISaveJsonFileAction {
  return {
    type: ActionTypes.SAVE_JSON_FILE,
    url,
  };
}

export function SaveJsonFileFulfilled(data: any): ISaveJsonFileFulfilledAction {
  return {
    type: ActionTypes.SAVE_JSON_FILE_FULFILLED,
    data,
  };
}

export function SaveJsonFileRejected(error: Error): ISaveJsonFileRejectedAction {
  return {
    type: ActionTypes.SAVE_JSON_FILE_REJECTED,
    error,
  };
}
