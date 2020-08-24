import { Action } from 'redux';
import * as ActionTypes from '../formDynamicsActionTypes';

export interface IFetchServiceConfig extends Action {
  url: string;
}

export interface IFetchServiceConfigFulfilled extends Action {
  apis: any;
  ruleConnection: any;
  conditionalRendering: any;
}

export interface IFetchServiceConfigRejected extends Action {
  error: Error;
}

export function fetchServiceConfig(url: string): IFetchServiceConfig {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG,
    url,
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
