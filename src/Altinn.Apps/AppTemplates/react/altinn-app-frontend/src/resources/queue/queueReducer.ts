import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as DataTaskQueueActionTypes from './dataTask/dataTaskQueueActionTypes';
import * as AppTaskQueueActionTypes from './appTask/appTaskQueueActionTypes';
import { IQueueError } from './queueActions';

export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
}

export interface IQueueTask {
  isDone: boolean;
  error: any;
}

const initialState: IQueueState = {
  dataTask: {
    isDone: null,
    error: null,
  },
  appTask: {
    isDone: null,
    error: null,
  },
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
        dataTask: {
          isDone: {
            $set: false,
          },
        },
      });
    }
    case DataTaskQueueActionTypes.START_INITIAL_DATA_TASK_QUEUE_FULFILLED: {
      return update<IQueueState>(state, {
        dataTask: {
          isDone: {
            $set: true,
          },
        },
      });
    }
    case DataTaskQueueActionTypes.DATA_TASK_QUEUE_ERROR: {
      const { error } = action as IQueueError;
      return update<IQueueState>(state, {
        dataTask: {
          error: {
            $set: error,
          },
        },
      });
    }
    case AppTaskQueueActionTypes.START_INITIAL_APP_TASK_QUEUE: {
      return update<IQueueState>(state, {
        appTask: {
          isDone: {
            $set: false,
          },
        },
      });
    }
    case AppTaskQueueActionTypes.START_INITIAL_APP_TASK_QUEUE_FULFILLED: {
      return update<IQueueState>(state, {
        appTask: {
          isDone: {
            $set: true,
          },
        },
      });
    }
    case AppTaskQueueActionTypes.APP_TASK_QUEUE_ERROR: {
      const { error } = action as IQueueError;
      return update<IQueueState>(state, {
        appTask: {
          error: {
            $set: error,
          },
        },
      });
    }
    default: { return state; }
  }
};

export default queueReducer;
