import { Action } from 'redux';
import * as ActionTypes from './dataTaskQueueActionTypes';

export function startInitialDataTaskQueue(): Action {
  return {
    type: ActionTypes.START_INITIAL_DATA_TASK_QUEUE,
  };
}

export function startInitialDataTaskQueueFulfilled(): Action {
  return {
    type: ActionTypes.START_INITIAL_DATA_TASK_QUEUE_FULFILLED,
  };
}
