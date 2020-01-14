import { Action } from 'redux';
import * as ActionTypes from '../appClusterActionTypes';

export interface IGetDeployments extends Action {
  env: string;
  org: string;
  repo: string;
}
export interface IGetDeploymentsFulfilled extends Action {
  result: any;
  env: string;
}
export interface IGetDeploymentsRejected extends Action {
  error: Error;
  env: string;
}
export function getDeploymentsAction(env: string, org: string, repo: string): IGetDeployments {
  return {
    type: ActionTypes.GET_DEPLOYMENTS,
    env,
    org,
    repo,
  };
}
export function getDeploymentsFulfilledAction(result: any, env: string): IGetDeploymentsFulfilled {
  return {
    type: ActionTypes.GET_DEPLOYMENTS_FULFILLED,
    result,
    env,
  };
}
export function getDeploymentsRejectedAction(error: Error, env: string): IGetDeploymentsRejected {
  return {
    type: ActionTypes.GET_DEPLOYMENTS_REJECTED,
    error,
    env,
  };
}

export function getDeploymentsStartIntervalAction(): Action {
  return {
    type: ActionTypes.GET_DEPLOYMENTS_START_INTERVAL,
  };
}
export function getDeploymentsStopIntervalAction(): Action {
  return {
    type: ActionTypes.GET_DEPLOYMENTS_STOP_INTERVAL,
  };
}
