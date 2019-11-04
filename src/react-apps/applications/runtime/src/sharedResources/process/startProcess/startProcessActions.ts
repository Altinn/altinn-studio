import { Action } from 'redux';
import * as ActionTypes from '../processActionTypes';

export interface IStartProcessFulfilled extends Action {
  result: any;
}

export interface IStartProcessRejected extends Action {
  error: Error;
}

export function startProcess(): Action {
  return {
    type: ActionTypes.START_PROCESS,
  };
}

export function startProcessFulfilled(result: any): IStartProcessFulfilled {
  return {
    type: ActionTypes.START_PROCESS_FULFILLED,
    result,
  };
}

export function startProcessRejected(error: Error): IStartProcessRejected {
  return {
    type: ActionTypes.START_PROCESS_REJECTED,
    error,
  };

}
