import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ActionTypes from '../actions/types';
import {
  IFetchDataModelFulfilled,
  IFetchDataModelRejected,
} from '../actions/fetch';

export interface IDataModelState {
  dataModel: any;
  error: Error;
}

const initialState: IDataModelState = {
  dataModel: {},
  error: null,
};

const DataModelReducer: Reducer<IDataModelState> = (
  state: IDataModelState = initialState,
  action?: Action,
): IDataModelState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_DATA_MODEL_FULFILLED: {
      const { dataModel } = action as IFetchDataModelFulfilled;
      return update<IDataModelState>(state, {
        $set: {
          dataModel,
          error: null,
        },
      });
    }
    case ActionTypes.FETCH_DATA_MODEL_REJECTED: {
      const { error } = action as IFetchDataModelRejected;
      return update<IDataModelState>(state, {
        $set: {
          dataModel: state.dataModel,
          error,
        },
      });
    }
    default: {
      return state;
    }
  }
}

export default DataModelReducer;