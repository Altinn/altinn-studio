import { Action } from 'redux';
import * as ActionTypes from '../repoStatusActionTypes';

export interface IGetMasterRepoStatus extends Action {
  org: string;
  repo: string;
}
export interface IGetMasterRepoStatusFulfilled extends Action {
  result: any;
}
export interface IGetMasterRepoStatusRejected extends Action {
  error: Error;
}
export function getMasterRepoStatusAction(org: string, repo: string): IGetMasterRepoStatus {
  return {
    type: ActionTypes.GET_MASTER_REPO_STATUS,
    org,
    repo,
  };
}
export function getMasterRepoStatusFulfilledAction(result: any): IGetMasterRepoStatusFulfilled {
  return {
    type: ActionTypes.GET_MASTER_REPO_STATUS_FULFILLED,
    result,
  };
}
export function getMasterRepoStatusRejectedAction(error: Error): IGetMasterRepoStatusRejected {
  return {
    type: ActionTypes.GET_MASTER_REPO_STATUS_REJECTED,
    error,
  };
}
