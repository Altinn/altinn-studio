import { Action } from 'redux';
import * as ActionTypes from '../formDynamicsActionTypes';

export interface IFetchServiceConfigFulfilled extends Action {
  apis: any;
  ruleConnection: any;
  conditionalRendering: any;
}

export interface IFetchServiceConfigRejected extends Action {
  error: Error;
}

export function fetchServiceConfig(): Action {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG,
  };
}

export function fetchServiceConfigFulfilled(
  apis: any,
  ruleConnection: any,
  conditionalRendering: any,
): IFetchServiceConfigFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG_FULFILLED,
    apis,
    ruleConnection,
    conditionalRendering,
  };
}

export function fetchServiceConfigRejected(error: Error): IFetchServiceConfigRejected {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG_REJECTED,
    error,
  };
}
