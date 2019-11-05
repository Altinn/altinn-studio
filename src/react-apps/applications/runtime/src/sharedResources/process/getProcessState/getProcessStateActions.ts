import { Action } from 'redux';
import * as ActionTypes from '../processActionTypes';

export interface IGetProcessStateFulfilled extends Action {
  result: any;
}
export interface IGetProcessStateRejected extends Action {
  error: Error;
}
export function getProcessStateAction(): Action {
  return {
    type: ActionTypes.GET_PROCESS_STATE,
  };
}
export function getProcessStateFulfilledAction(result: any): IGetProcessStateFulfilled {
  return {
    type: ActionTypes.GET_PROCESS_STATE_FULFILLED,
    result,
  };
}
export function getProcessStateRejectedAction(error: Error): IGetProcessStateRejected {
  return {
    type: ActionTypes.GET_PROCESS_STATE_REJECTED,
    error,
  };
}
