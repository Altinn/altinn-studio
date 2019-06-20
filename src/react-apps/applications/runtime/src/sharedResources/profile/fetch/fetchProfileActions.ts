import { Action } from 'redux';
import { IProfile } from './..';
import * as ActionTypes from './fetchProfileActionTypes';

export interface IFetchProfile extends Action {
  url: string;
}

export interface IFetchProfileFulfilled extends Action {
  profile: IProfile;
}

export interface IFetchProfileRejected extends Action {
  error: Error;
}

export function fetchProfile(url: string): IFetchProfile {
  return {
    type: ActionTypes.FETCH_PROFILE,
    url,
  };
}

export function fetchProfileFulfilled(
  profile: IProfile,
): IFetchProfileFulfilled {
  return {
    type: ActionTypes.FETCH_PROFILE_FULFILLED,
    profile,
  };
}

export function fetchProfileRejected(error: Error): IFetchProfileRejected {
  return {
    type: ActionTypes.FETCH_PROFILE_REJECTED,
    error,
  };
}
