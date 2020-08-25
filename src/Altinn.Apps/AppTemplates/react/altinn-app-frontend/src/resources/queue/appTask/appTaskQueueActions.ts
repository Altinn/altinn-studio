import { Action } from 'redux';
import * as ActionTypes from './appTaskQueueActionTypes';
import {IQueueError} from '../queueActions';

export function startInitialAppTaskQueue(): Action {
  return {
    type: ActionTypes.START_INITIAL_APP_TASK_QUEUE,
  };
}

export function startInitialAppTaskQueueFulfilled(): Action {
  return {
    type: ActionTypes.START_INITIAL_APP_TASK_QUEUE_FULFILLED,
  };
}

export function appTaskQueueError(error: any): IQueueError {
  return {
    error,
    type: ActionTypes.APP_TASK_QUEUE_ERROR,
  }
}
