import { Action } from 'redux';
import { IApplicationMetadata } from '../..';
import * as ApplicationMetadataActionTypes from '../types';

export function getApplicationMetadata(): Action {
  return {
    type: ApplicationMetadataActionTypes.FETCH_APPLICATION_METADATA,
  };
}

export interface IGetApplicationMetadataFulfilled extends Action {
  applicationMetadata: IApplicationMetadata;
}

export function getApplicationMetadataFulfilled(
  applicationMetadata: IApplicationMetadata,
): IGetApplicationMetadataFulfilled {
    return {
      type: ApplicationMetadataActionTypes.FETCH_APPLICATION_METADATA_FULFILLED,
      applicationMetadata,
    };
}

export interface IGetApplicationMetadataRejected extends Action {
  error: Error;
}

export function getApplicationMetadataRejected(
  error: Error,
): IGetApplicationMetadataRejected {
    return {
      type: ApplicationMetadataActionTypes.FETCH_APPLICATION_METADATA_REJECTED,
      error,
    };
}
