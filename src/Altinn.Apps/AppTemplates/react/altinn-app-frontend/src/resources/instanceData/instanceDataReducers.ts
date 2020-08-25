import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IInstance } from 'altinn-shared/types';
import { IGetInstanceDataFulfilled, IGetInstanceDataRejected } from './get/getInstanceDataActions';
import * as InstanceDataActionTypes from './get/getInstanceDataActionTypes';

export interface IInstanceDataState {
  instance: IInstance;
  error: Error;
}

const initialState: IInstanceDataState = {
  instance: null,
  error: null,
};

const instanceDataReducer: Reducer<IInstanceDataState> = (
  state: IInstanceDataState = initialState, action?: Action): IInstanceDataState => {
    if (!action) {
      return state;
    }
    switch (action.type) {
      case InstanceDataActionTypes.GET_INSTANCEDATA_FULFILLED: {
        const { instanceData } = action as IGetInstanceDataFulfilled;
        return update<IInstanceDataState>(state, {
          instance: {
            $set: instanceData,
          },
        });
      }
      case InstanceDataActionTypes.GET_INSTANCEDATA_REJECTED: {
        const { error } = action as IGetInstanceDataRejected;
        return update<IInstanceDataState>(state, {
          error: {
            $set: error,
          },
        });
      }
      default: { return state; }
    }
};

export default instanceDataReducer;
