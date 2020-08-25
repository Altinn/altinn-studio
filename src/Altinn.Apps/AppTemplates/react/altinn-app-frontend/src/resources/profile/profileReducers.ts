import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IProfile } from 'altinn-shared/types';
import {
  IFetchProfileFulfilled,
  IFetchProfileRejected,
} from './fetch/fetchProfileActions';
import * as ActionTypes from './fetch/fetchProfileActionTypes';

export interface IProfileState {
  profile: IProfile;
  error: Error;
}

const initalState: IProfileState = {
  profile: null,
  error: null,
};

const ProfileReducer: Reducer<IProfileState> = (
  state: IProfileState = initalState,
  action?: Action,
): IProfileState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_PROFILE_FULFILLED: {
      const { profile } = action as IFetchProfileFulfilled;
      return update<IProfileState>(state, {
        profile: {
          $set: profile,
        },
      });
    }
    case ActionTypes.FETCH_PROFILE_REJECTED: {
      const { error } = action as IFetchProfileRejected;
      return update<IProfileState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default ProfileReducer;
