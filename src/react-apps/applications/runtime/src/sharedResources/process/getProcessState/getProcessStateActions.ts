import { Action } from 'redux';
import * as ActionTypes from '../processActionTypes';

export interface IGetProcessState extends Action {
  instanceId: string;
}
export interface IGetProcessStateFulfilled extends Action {
  result: any;
}
export interface IGetProcessStateRejected extends Action {
  error: Error;
}
export function getProcessStateAction(instanceId: string): IGetProcessState {
  return {
    type: ActionTypes.GET_PROCESS_STATE,
    instanceId,
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
