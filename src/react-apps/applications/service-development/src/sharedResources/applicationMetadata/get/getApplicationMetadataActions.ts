import { Action } from 'redux';
import * as ActionTypes from '../applicationMetadataActionTypes';

export interface IGetApplicationMetadataFulfilled extends Action {
  applicationMetadata: any;
}

export interface IGetApplicationMetadataRejected extends Action {
  error: Error;
}

export function getApplicationMetadata(): Action {
  return {
    type: ActionTypes.GET_APPLICATION_METADATA,
  };
}

export function getApplicationMetadataFulfilled(applicationMetadata: any): IGetApplicationMetadataFulfilled {
  return {
    type: ActionTypes.GET_APPLICATION_METADATA_FULFILLED,
    applicationMetadata,
  };
}

export function getApplicationMetadataRejected(error: Error): IGetApplicationMetadataRejected {
  return {
    type: ActionTypes.GET_APPLICATION_METADATA_REJECTED,
    error,
  };
}
