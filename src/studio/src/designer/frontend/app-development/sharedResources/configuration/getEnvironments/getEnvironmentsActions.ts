import { Action } from 'redux';
import * as ActionTypes from '../configurationActionTypes';

export function GetEnvironmentsAction(): Action {
  return {
    type: ActionTypes.GET_ENVIRONMENTS,
  };
}

export interface IGetEnvironmentsFulfilled extends Action {
  result: any;
}

export function GetEnvironmentsFulfilledAction(result: any): IGetEnvironmentsFulfilled {
  return {
    type: ActionTypes.GET_ENVIRONMENTS_FULFILLED,
    result,
  };
}

export interface IGetEnvironmentsRejected extends Action {
  error: Error;
}

export function GetEnvironmentsRejectedAction(error: Error): IGetEnvironmentsRejected {
  return {
    type: ActionTypes.GET_ENVIRONMENTS_REJECTED,
    error,
  };
}
