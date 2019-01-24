import { Action } from 'redux';
import * as ActionTypes from './handleMergeConflictActionTypes';

export interface IFetchRepoStatusAction extends Action {
  url: string;
  org: string;
  repo: string;
}

export interface IFetchRepoStatusFulfilled extends Action {
  result: any;
}

export interface IFetchRepoStatusRejected extends Action {
  error: Error;
}

export function fetchRepoStatusAction(url: string, org: string, repo: string): IFetchRepoStatusAction {
  return {
    type: ActionTypes.FETCH_REPO_STATUS,
    url,
    org,
    repo,
  };
}

export function fetchRepoStatusFulfilledAction(result: any): IFetchRepoStatusFulfilled {
  return {
    type: ActionTypes.FETCH_REPO_STATUS_FULFILLED,
    result,
  };
}

export function fetchRepoStatusRejectedAction(error: Error): IFetchRepoStatusRejected {
  return {
    type: ActionTypes.FETCH_REPO_STATUS_REJECTED,
    error,
  };
}
