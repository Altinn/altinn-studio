import { Action } from 'redux';
import * as ActionTypes from './dataTaskQueueActionTypes';
import { IQueueError } from '../queueActions';

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

export function dataTaskQueueError(error: any): IQueueError {
  return {
    error,
    type: ActionTypes.DATA_TASK_QUEUE_ERROR,
  };
}
