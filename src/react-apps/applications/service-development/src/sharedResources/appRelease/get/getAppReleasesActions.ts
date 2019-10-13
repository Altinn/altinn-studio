import { Action } from 'redux';
import * as AppReleaseActionTypes from '../appReleaseActionTypes';
import { IRelease } from '../types';

export function getAppReleases(): Action {
  return {
    type: AppReleaseActionTypes.GET_APP_RELEASES,
  };
}

export interface IGetReleaseActionFulfilled extends Action {
  releases: IRelease[];
}

export function getAppReleasesFulfilled(releases: IRelease[]): IGetReleaseActionFulfilled {
  return {
    type: AppReleaseActionTypes.GET_APP_RELEASES_FULFILLED,
    releases,
  };
}

export interface IGetReleaseActionRejected extends Action {
  error: Error;
}

export function getAppReleasesRejected(error: Error): IGetReleaseActionRejected {
  return {
    type: AppReleaseActionTypes.GET_APP_RELEASES_REJECTED,
    error,
  };
}
