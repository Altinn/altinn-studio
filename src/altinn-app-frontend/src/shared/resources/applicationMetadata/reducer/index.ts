import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IApplicationMetadata } from '..';
import { IGetApplicationMetadataFulfilled, IGetApplicationMetadataRejected } from '../actions/get';
import * as ApplicationMetadataActionTypes from '../actions/types';

export interface IApplicationMetadataState {
  applicationMetadata: IApplicationMetadata;
  error: Error;
}

const initialState: IApplicationMetadataState = {
  applicationMetadata: null,
  error: null,
};

const applicationMetadataReducer: Reducer<IApplicationMetadataState> = (
  state: IApplicationMetadataState = initialState,
  action?: Action,
): IApplicationMetadataState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case ApplicationMetadataActionTypes.FETCH_APPLICATION_METADATA_FULFILLED: {
      const { applicationMetadata } = action as IGetApplicationMetadataFulfilled;
      return update<IApplicationMetadataState>(state, {
        applicationMetadata: {
          $set: applicationMetadata,
        },
        error: {
          $set: null,
        },
      });
    }
    case ApplicationMetadataActionTypes.FETCH_APPLICATION_METADATA_REJECTED: {
      const { error } = action as IGetApplicationMetadataRejected;
      return update<IApplicationMetadataState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default applicationMetadataReducer;
