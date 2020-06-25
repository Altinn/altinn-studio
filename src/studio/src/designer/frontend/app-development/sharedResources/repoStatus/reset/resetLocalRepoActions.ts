import { Action } from 'redux';
import * as ActionTypes from '../repoStatusActionTypes';

export interface IResetLocalRepo extends Action {
  org: string;
  repo: string;
}
export interface IResetLocalRepoFulfilled extends Action {
  result: any;
}
export interface IResetLocalRepoRejected extends Action {
  error: Error;
}
export function resetLocalRepoAction(org: string, repo: string): IResetLocalRepo {
  return {
    type: ActionTypes.RESET_LOCAL_REPO,
    org,
    repo,
  };
}
export function resetLocalRepoFulfilledAction(result: any): IResetLocalRepoFulfilled {
  return {
    type: ActionTypes.RESET_LOCAL_REPO_FULFILLED,
    result,
  };
}
export function resetLocalRepoRejectedAction(error: Error): IResetLocalRepoRejected {
  return {
    type: ActionTypes.RESET_LOCAL_REPO_REJECTED,
    error,
  };
}
