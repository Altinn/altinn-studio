import { Action } from 'redux';
import * as AppReleaseActionTypes from './appReleaseActionTypes';
import { IRelease } from './types';

export function getReleases(): Action {
  return {
    type: AppReleaseActionTypes.GET_APP_RELEASES,
  };
}

export interface IGetReleaseActionFulfilled extends Action {
  releases: IRelease[];
}

export function getReleasesFulfilled(releases: IRelease[]): IGetReleaseActionFulfilled {
  return {
    type: AppReleaseActionTypes.GET_APP_RELEASES_FULFILLED,
    releases,
  };
}

export interface IGetReleaseActionRejected extends Action {
  error: Error;
}

export function getReleasesRejected(error: Error): IGetReleaseActionRejected {
  return {
    type: AppReleaseActionTypes.GET_APP_RELEASES_REJECTED,
    error,
  };
}

export interface ICreateReleaseAction extends Action {
  tag_name: string;
  name: string;
  body: string;
  target_commitish: string;
}

export function createRelease(
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

export function createReleaseFulfilled(id: string): ICreateReleaseFulfilledAction {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE_FULFILLED,
    id,
  };
}

export interface ICreateReleaseRejectedActions extends Action {
  error: Error;
}

export function createReleaseRejected(error: Error): ICreateReleaseRejectedActions {
  return {
    type: AppReleaseActionTypes.CREATE_APP_RELEASE_REJECTED,
    error,
  };
}
