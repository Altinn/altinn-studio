import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateApplicationMetadaAction extends Action {
  id: string;
  maxFiles: number;
  minFiles: number;
  maxSize: number;
  fileType: string;
}

export interface IUpdateApplicationMetadaActionRejected extends Action {
  error: Error;
}

export function updateApplicationMetadaAction(
  id: string,
  maxFiles: number,
  minFiles: number,
  maxSize: number,
  fileType: string,
): IUpdateApplicationMetadaAction {
  return {
    type: ActionTypes.UPDATE_APPLICATION_METADATA,
    id,
    maxFiles,
    minFiles,
    maxSize,
    fileType,
  };
}

export function updateApplicationMetadaActionFulfilled():
  Action {
  return {
    type: ActionTypes.UPDATE_APPLICATION_METADATA_FULFILLED,
  };
}

export function updateApplicationMetadaActionRejected(error: Error): IUpdateApplicationMetadaActionRejected {
  return {
    type: ActionTypes.UPDATE_APPLICATION_METADATA_REJECTED,
    error,
  };
}
