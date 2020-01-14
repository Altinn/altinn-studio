import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddApplicationMetadataAction extends Action {
  id: string;
  maxFiles: number;
  minFiles: number;
  maxSize: number;
  fileType: string;
}

export interface IAddApplicationMetadataActionRejected extends Action {
  error: Error;
}

export function addApplicationMetadataAction(
  id: string,
  maxFiles: number,
  minFiles: number,
  maxSize: number,
  fileType: string,
): IAddApplicationMetadataAction {
  return {
    type: ActionTypes.ADD_APPLICATION_METADATA,
    id,
    maxFiles,
    minFiles,
    maxSize,
    fileType,
  };
}

export function addApplicationMetadataActionFulfilled(
): Action {
  return {
    type: ActionTypes.ADD_APPLICATION_METADATA_FULFILLED,
  };
}

export function addApplicationMetadataActionRejected(error: Error): IAddApplicationMetadataActionRejected {
  return {
    type: ActionTypes.ADD_APPLICATION_METADATA_REJECTED,
    error,
  };
}
