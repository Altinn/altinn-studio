import { Action } from 'redux';
import * as AppReleaseActionTypes from '../appReleaseActionTypes';
import { IRelease } from '../types';

export interface ICreateReleaseAction extends Action {
  tagName: string;
  name: string;
  body: string;
  targetCommitish: string;
}

export function createAppRelease(
  tagName: string,
  name: string,
  body: string,
  targetCommitish: string,
): ICreateReleaseAction {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE,
    tagName,
    targetCommitish,
    name,
    body,
  };
}

export interface ICreateReleaseFulfilledAction extends Action {
  release: IRelease;
}

export function createAppReleaseFulfilled(release: IRelease): ICreateReleaseFulfilledAction {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE_FULFILLED,
    release,
  };
}

export interface ICreateReleaseRejectedActions extends Action {
  errorCode: number;
}

export function createAppReleaseRejected(errorCode: number): ICreateReleaseRejectedActions {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE_REJECTED,
    errorCode,
  };
}
