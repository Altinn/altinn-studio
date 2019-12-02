import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as DataTaskQueueActionTypes from './dataTask/dataTaskQueueActionTypes';

export interface IQueueState {
  dataTaskFinished: boolean;
}

const initialState: IQueueState = {
  dataTaskFinished: null,
};

const queueReducer: Reducer<IQueueState> = (
  state: IQueueState = initialState,
  action?: Action,
): IQueueState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case DataTaskQueueActionTypes.START_INITIAL_DATA_TASK_QUEUE: {
      return update<IQueueState>(state, {
        dataTaskFinished: {
          $set: false,
        },
      });
    }
    case DataTaskQueueActionTypes.START_INITIAL_DATA_TASK_QUEUE_FULFILLED: {
      return update<IQueueState>(state, {
        dataTaskFinished: {
          $set: true,
        },
      });
    }
    default: { return state; }
  }
};

export default queueReducer;
