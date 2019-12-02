import { Action } from 'redux';
import * as ActionTypes from './dataTaskQueueActionTypes';

export interface IDataTaskQueue extends Action {
}

export function startInitialDataTaskQueue(): IDataTaskQueue {
  return {
    type: ActionTypes.START_INITIAL_DATA_TASK_QUEUE,
  };
}
