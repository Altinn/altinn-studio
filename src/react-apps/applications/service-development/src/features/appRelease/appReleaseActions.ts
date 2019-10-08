import { Action } from 'redux';
import * as AppReleaseActionTypes from './appReleaseActionTypes';
import { IRelease } from './types';

export function fetchReleases(): Action {
  return {
    type: AppReleaseActionTypes.FETCH_APP_DEPLOYMENTS,
  };
}

export interface IFetchReleaseActionFulfilled extends Action {
  releases: IRelease[];
}

export function fetchReleasesFulfilled(releases: IRelease[]): IFetchReleaseActionFulfilled {
  return {
    type: AppReleaseActionTypes.FETCH_APP_DEPLOYMENTS_FULFILLED,
    releases,
  };
}

export interface IFetchReleaseActionRejected extends Action {
  error: Error;
}

export function fetchReleasesRejected(error: Error): IFetchReleaseActionRejected {
  return {
    type: AppReleaseActionTypes.FETCH_APP_DEPLOYMENTS_REJECTED,
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
    type: AppReleaseActionTypes.CREATE_APP_DEPLOYMENT,
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
    type: AppReleaseActionTypes.CREATE_APP_DEPLOTMENT_FULFILLED,
    id,
  };
}

export interface ICreateReleaseRejectedActions extends Action {
  error: Error;
}

export function createReleaseRejected(error: Error): ICreateReleaseRejectedActions {
  return {
    type: AppReleaseActionTypes.CREATE_APP_DEPLOTMENT_REJECTED,
    error,
  };
}
