import { Action } from 'redux';
import * as ActionTypes from './deployActionTypes';

export interface IFetchDeployments extends Action {
  env: string;
  org: string;
  repo: string;
}
export interface IFetchDeploymentsFulfilled extends Action {
  result: any;
  env: any;
}
export interface IFetchDeploymentsRejected extends Action {
  result: Error;
  env: string;
}
export function fetchDeploymentsAction(env: string, org: string, repo: string): IFetchDeployments {
  return {
    type: ActionTypes.FETCH_DEPLOYMENTS,
    env,
    org,
    repo,
  };
}
export function fetchDeploymentsFulfilledAction(result: any, env: string): IFetchDeploymentsFulfilled {
  return {
    type: ActionTypes.FETCH_DEPLOYMENTS_FULFILLED,
    result,
    env,
  };
}
export function fetchDeploymentsRejectedAction(result: Error, env: string): IFetchDeploymentsRejected {
  return {
    type: ActionTypes.FETCH_DEPLOYMENTS_REJECTED,
    result,
    env,
  };
}

export interface IFetchMasterRepoStatus extends Action {
  org: string;
  repo: string;
}
export interface IFetchMasterRepoStatusFulfilled extends Action {
  result: any;
}
export interface IFetchMasterRepoStatusRejected extends Action {
  error: Error;
}
export function fetchMasterRepoStatusAction(org: string, repo: string): IFetchMasterRepoStatus {
  return {
    type: ActionTypes.FETCH_MASTER_REPO_STATUS,
    org,
    repo,
  };
}
export function fetchMasterRepoStatusFulfilledAction(result: any): IFetchMasterRepoStatusFulfilled {
  return {
    type: ActionTypes.FETCH_MASTER_REPO_STATUS_FULFILLED,
    result,
  };
}
export function fetchMasterRepoStatusRejectedAction(error: Error): IFetchMasterRepoStatusRejected {
  return {
    type: ActionTypes.FETCH_MASTER_REPO_STATUS_REJECTED,
    error,
  };
}

export interface IDeployAltinnApp extends Action {
  env: string;
  org: string;
  repo: string;
}
export interface IDeployAltinnAppFulfilled extends Action {
  result: any;
  env: any;
}
export interface IDeployAltinnAppRejected extends Action {
  result: Error;
  env: string;
}
export function deployAltinnAppAction(env: string, org: string, repo: string): IDeployAltinnApp {
  return {
    type: ActionTypes.DEPLOY_ALTINN_APP,
    env,
    org,
    repo,
  };
}
export function deployAltinnAppFulfilledAction(result: any, env: string): IDeployAltinnAppFulfilled {
  return {
    type: ActionTypes.DEPLOY_ALTINN_APP_FULFILLED,
    result,
    env,
  };
}
export function deployAltinnAppRejectedAction(result: Error, env: string): IDeployAltinnAppRejected {
  return {
    type: ActionTypes.DEPLOY_ALTINN_APP_REJECTED,
    result,
    env,
  };
}

export interface IFetchDeployAltinnAppStatus extends Action {
  buildId: string;
  org: string;
  repo: string;
  env: string;
}
export interface IFetchDeployAltinnAppStatusFulfilled extends Action {
  result: any;
  env: any;
}
export interface IFetchDeployAltinnAppStatusRejected extends Action {
  result: Error;
  env: string;
}
export function fetchDeployAltinnAppStatusAction(env: string, org: string, repo: string, buildId: string):
  IFetchDeployAltinnAppStatus {
  return {
    type: ActionTypes.FETCH_DEPLOY_ALTINN_APP_STATUS,
    env,
    org,
    repo,
    buildId,
  };
}
export function fetchDeployAltinnAppStatusFulfilledAction(result: any, env: string):
  IFetchDeployAltinnAppStatusFulfilled {
  return {
    type: ActionTypes.FETCH_DEPLOY_ALTINN_APP_STATUS_FULFILLED,
    result,
    env,
  };
}
export function fetchDeployAltinnAppStatusRejectedAction(result: Error, env: string):
  IFetchDeployAltinnAppStatusRejected {
  return {
    type: ActionTypes.FETCH_DEPLOY_ALTINN_APP_STATUS_REJECTED,
    result,
    env,
  };
}

export interface IResetDeploymentStatus extends Action {
  env: string;
}
export function resetDeploymentStatusAction(env: string):
  IResetDeploymentStatus {
  return {
    type: ActionTypes.RESET_DEPLOYMENT_STATUS,
    env,
  };
}

export interface IFetchCompileStatus extends Action {
  org: string;
  repo: string;
}
export interface IFetchCompileStatusFulfilled extends Action {
  result: any;
}
export interface IFetchCompileStatusRejected extends Action {
  result: Error;
}
export function fetchCompileStatusAction(org: string, repo: string):
  IFetchCompileStatus {
  return {
    type: ActionTypes.FETCH_COMPILE_STATUS,
    org,
    repo,
  };
}
export function fetchCompileStatusFulfilledAction(result: any):
  IFetchCompileStatusFulfilled {
  return {
    type: ActionTypes.FETCH_COMPILE_STATUS_FULFILLED,
    result,
  };
}
export function fetchCompileStatusRejectedAction(result: Error):
  IFetchCompileStatusRejected {
  return {
    type: ActionTypes.FETCH_COMPILE_STATUS_REJECTED,
    result,
  };
}
