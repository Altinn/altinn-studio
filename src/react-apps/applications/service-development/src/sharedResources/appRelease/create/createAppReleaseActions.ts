import { Action } from 'redux';
import * as AppReleaseActionTypes from '../appReleaseActionTypes';

export interface ICreateReleaseAction extends Action {
  tag_name: string;
  name: string;
  body: string;
  target_commitish: string;
}

export function createAppRelease(
  tagName: string,
  name: string,
  body: string,
  targetCommitish: string,
): ICreateReleaseAction {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE,
    tag_name: tagName,
    target_commitish: targetCommitish,
    name,
    body,
  };
}

export interface ICreateReleaseFulfilledAction extends Action {
  id: string;
}

export function createAppReleaseFulfilled(id: string): ICreateReleaseFulfilledAction {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE_FULFILLED,
    id,
  };
}

export interface ICreateReleaseRejectedActions extends Action {
  error: Error;
}

export function createAppReleaseRejected(error: Error): ICreateReleaseRejectedActions {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE_REJECTED,
    error,
  };
}
