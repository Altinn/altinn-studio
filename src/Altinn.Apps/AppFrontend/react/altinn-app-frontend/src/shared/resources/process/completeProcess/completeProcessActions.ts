import { Action } from 'redux';
import { ProcessSteps } from '../../../../types';
import * as ActionTypes from '../processActionTypes';

export interface ICompleteProcessFulfilled extends Action {
  processStep: ProcessSteps;
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
export function getProcessStateFulfilledAction(processStep: ProcessSteps, taskId: string): ICompleteProcessFulfilled {
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
