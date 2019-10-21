import { Action } from 'redux';
import * as ActionTypes from '../applicationMetadataActionTypes';

export interface IPutApplicationMetadata extends Action {
  applicationMetadata: any;
}

export interface IPutApplicationMetadataFulfilled extends Action {
  applicationMetadata: any;
}

export interface IPutApplicationMetadataRejected extends Action {
  error: Error;
}

export function putApplicationMetadata(applicationMetadata: any): IPutApplicationMetadata {
  return {
    type: ActionTypes.PUT_APPLICATION_METADATA,
    applicationMetadata,
  };
}

export function putApplicationMetadataFulfilled(applicationMetadata: any): IPutApplicationMetadataFulfilled {
  return {
    type: ActionTypes.PUT_APPLICATION_METADATA_FULFILLED,
    applicationMetadata,
  };
}

export function putApplicationMetadataRejected(error: Error): IPutApplicationMetadataRejected {
  return {
    type: ActionTypes.PUT_APPLICATION_METADATA_REJECTED,
    error,
  };
}
