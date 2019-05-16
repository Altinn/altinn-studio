import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddApplicationMetadataAction extends Action {
  id: string,
  maxFiles: number;
  maxSize: number;
  fileType: string;
  callback?: (...args: any[]) => any;
}

export interface IAddApplicationMetadataActionFulfilled extends Action {
  id: string;
  maxFiles: number;
  maxSize: number;
  fileType: string;
  callback?: (...args: any[]) => any;
}

export interface IAddApplicationMetadataActionRejected extends Action {
  error: Error;
}

export function addApplicationMetadataAction(
  id: string,
  maxFiles: number,
  maxSize: number,
  fileType: string,
  callback?: (...args: any[]) => any): IAddApplicationMetadataAction {
  return {
    type: ActionTypes.ADD_APPLICATION_METADATA,
    id,
    maxFiles,
    maxSize,
    fileType,
    callback,
  };
}

export function addApplicationMetadataActionFulfilled(
  id: string,
  maxFiles: number,
  maxSize: number,
  fileType: string,
  callback?: (...args: any[]) => any,
): IAddApplicationMetadataActionFulfilled {
  return {
    type: ActionTypes.ADD_APPLICATION_METADATA_FULFILLED,
    id,
    maxFiles,
    maxSize,
    fileType,
    callback,
  };
}

export function addApplicationMetadataActionRejected(error: Error): IAddApplicationMetadataActionRejected {
  return {
    type: ActionTypes.ADD_APPLICATION_METADATA_REJECTED,
    error,
  };
}
