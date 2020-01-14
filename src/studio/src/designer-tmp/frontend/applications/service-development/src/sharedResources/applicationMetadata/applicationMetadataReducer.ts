import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ActionTypes from './applicationMetadataActionTypes';
import { IGetApplicationMetadataFulfilled } from './get/getApplicationMetadataActions';
import { IPutApplicationMetadataFulfilled } from './put/putApplicationMetaDataActions';

export interface IApplicationMetadataState {
  applicationMetadata: any;
  error: Error;
}

const initialState: IApplicationMetadataState = {
  applicationMetadata: {},
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
    case ActionTypes.GET_APPLICATION_METADATA_FULFILLED: {
      const { applicationMetadata } = action as IGetApplicationMetadataFulfilled;
      return update(state, {
        applicationMetadata: {
          $set: applicationMetadata,
        },
      });
    }
    case ActionTypes.PUT_APPLICATION_METADATA_FULFILLED: {
      const { applicationMetadata } = action as IPutApplicationMetadataFulfilled;
      return update(state, {
        applicationMetadata: {
          $set: applicationMetadata,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default applicationMetadataReducer;
