import { Action } from 'redux';
import { ProcessTaskType } from '../../../../types';
import * as ActionTypes from '../processActionTypes';

export interface ICompleteProcessFulfilled extends Action {
  processStep: ProcessTaskType;
  taskId: string;
}
export interface ICompleteProcessRejected extends Action {
  error: Error;
}

export function completeProcess(): Action {
  return {
    type: ActionTypes.COMPLETE_PROCESS,
  };
}
export function getProcessStateFulfilledAction(
  processStep: ProcessTaskType,
  taskId: string,
): ICompleteProcessFulfilled {
  return {
    type: ActionTypes.COMPLETE_PROCESS_FULFILLED,
    processStep,
    taskId,
  };
}
export function getProcessStateRejectedAction(error: Error): ICompleteProcessRejected {
  return {
    type: ActionTypes.COMPLETE_PROCESS_REJECTED,
    error,
  };
}
