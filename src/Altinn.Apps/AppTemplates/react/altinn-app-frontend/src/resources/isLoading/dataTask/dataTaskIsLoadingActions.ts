import { Action } from 'redux';
import * as ActionTypes from './dataTaskIsLoadingActionTypes';

export interface IDataTaskIsloading extends Action {
}

export function startDataTaskIsloading(): IDataTaskIsloading {
  return {
    type: ActionTypes.START_DATA_TASK_LOADER,
  };
}

export function finishDataTaskIsloading(): IDataTaskIsloading {
  return {
    type: ActionTypes.FINISH_DATA_TASK_LOADER,
  };
}
