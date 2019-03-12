import { Action } from 'redux';
import { WorkflowSteps } from '../../../containers/WorkflowStep';
import * as ActionTypes from '../workflowActionTypes';

export interface IGetCurrentState extends Action {
  url: string;
}

export interface IGetCurrentStateFulfilled extends Action {
  state: WorkflowSteps;
}

export interface IGetCurrentStateRejected extends Action {
  error: Error;
}

export interface ISetCurrentState extends Action {
  state: WorkflowSteps;
}

export function getCurrentState(url: string): IGetCurrentState {
  return {
    type: ActionTypes.GET_CURRENT_STATE,
    url,
  };
}

export function getCurrentStateFulfilled(state: WorkflowSteps): IGetCurrentStateFulfilled {
  return {
    type: ActionTypes.GET_CURRENT_STATE_FULFILLED,
    state,
  };
}

export function getCurrentStateRejected(error: Error): IGetCurrentStateRejected {
  return {
    type: ActionTypes.GET_CURRENT_STATE_REJECTED,
    error,
  };
}

export function setCurrentState(state: WorkflowSteps): ISetCurrentState {
  return {
    type: ActionTypes.SET_CURRENT_STATE,
    state,
  };
}
