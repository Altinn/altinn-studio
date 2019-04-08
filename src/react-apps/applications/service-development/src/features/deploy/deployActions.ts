import { Action } from 'redux';
import * as ActionTypes from './deployActionTypes';

export interface IFetchDeploymentsAction extends Action {
  env: string;
  org: string;
  repo: string;
}

export interface IFetchDeploymentsFulfilled extends Action {
  result: any;
  env: any;
}

export interface IFetchDeploymentsRejected extends Action {
  error: Error;
}

export function fetchDeploymentsAction(env: string, org: string, repo: string): IFetchDeploymentsAction {
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

export function fetchDeploymentsRejectedAction(error: Error): IFetchDeploymentsRejected {
  return {
    type: ActionTypes.FETCH_DEPLOYMENTS_REJECTED,
    error,
  };
}

export interface IFetchMasterRepoStatusAction extends Action {
  url: string;
  org: string;
  repo: string;
}

export interface IFetchMasterRepoStatusFulfilled extends Action {
  result: any;
}

export interface IFetchMasterRepoStatusRejected extends Action {
  error: Error;
}

export function fetchMasterRepoStatusAction(url: string, org: string, repo: string): IFetchMasterRepoStatusAction {
  return {
    type: ActionTypes.FETCH_MASTER_REPO_STATUS,
    url,
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
