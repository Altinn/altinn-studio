import { Action } from 'redux';
import { ProcessTaskType } from '../../../../types';
import * as ActionTypes from '../processActionTypes';

export interface IGetProcessStateFulfilled extends Action {
  processStep: ProcessTaskType;
  taskId: string;
}
export interface IGetProcessStateRejected extends Action {
  error: Error;
}
export function getProcessStateAction(): Action {
  return {
    type: ActionTypes.GET_PROCESS_STATE,
  };
}
export function getProcessStateFulfilledAction(
  processStep: ProcessTaskType,
  taskId: string,
): IGetProcessStateFulfilled {
  return {
    type: ActionTypes.GET_PROCESS_STATE_FULFILLED,
    processStep,
    taskId,
  };
}
export function getProcessStateRejectedAction(error: Error): IGetProcessStateRejected {
  return {
    type: ActionTypes.GET_PROCESS_STATE_REJECTED,
    error,
  };
}
