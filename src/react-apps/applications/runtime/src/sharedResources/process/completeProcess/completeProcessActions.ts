import { Action } from 'redux';
import * as ActionTypes from '../processActionTypes';
import { ProcessSteps } from '../typings';

export interface ICompleteProcessFulfilled extends Action {
  processStep: ProcessSteps;
}
export interface ICompleteProcessRejected extends Action {
  error: Error;
}

export function completeProcess(): Action {
  return {
    type: ActionTypes.COMPLETE_PROCESS,
  };
}
export function getProcessStateFulfilledAction(processStep: ProcessSteps): ICompleteProcessFulfilled {
  return {
    type: ActionTypes.COMPLETE_PROCESS_FULFILLED,
    processStep,
  };
}
export function getProcessStateRejectedAction(error: Error): ICompleteProcessRejected {
  return {
    type: ActionTypes.COMPLETE_PROCESS_REJECTED,
    error,
  };
}
