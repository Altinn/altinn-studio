import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as DataTaskIsLoadingActionTypes from './dataTask/dataTaskIsLoadingActionTypes';

export interface IIsLoadingState {
  dataTask: boolean;
}

const initialState: IIsLoadingState = {
  dataTask: null,
};

const isLoadingReducer: Reducer<IIsLoadingState> = (
  state: IIsLoadingState = initialState,
  action?: Action,
): IIsLoadingState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case DataTaskIsLoadingActionTypes.START_DATA_TASK_LOADER: {
      return update<IIsLoadingState>(state, {
        dataTask: {
          $set: true,
        },
      });
    }
    case DataTaskIsLoadingActionTypes.FINISH_DATA_TASK_LOADER: {
      return update<IIsLoadingState>(state, {
        dataTask: {
          $set: false,
        },
      });
    }
    default: { return state; }
  }
};

export default isLoadingReducer;
