import update from 'immutability-helper';
import type { Action, Reducer } from 'redux';
import type { IProfile } from 'altinn-shared/types';
import type {
  IFetchProfileFulfilled,
  IFetchProfileRejected,
} from './fetch/fetchProfileActions';
import * as ActionTypes from './fetch/fetchProfileActionTypes';

export interface IProfileState {
  profile: IProfile;
  error: Error;
}

const initialState: IProfileState = {
  profile: {
    profileSettingPreference: {
      language: 'nb',
    },
  } as IProfile,
  error: null,
};

const ProfileReducer: Reducer<IProfileState> = (
  state: IProfileState = initialState,
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
