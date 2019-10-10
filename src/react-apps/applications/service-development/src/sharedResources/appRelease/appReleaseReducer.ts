import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import {
  ICreateReleaseRejectedActions,
  IGetReleaseActionFulfilled,
  IGetReleaseActionRejected,
} from './appReleaseActions';
import * as AppReleaseActionTypes from './appReleaseActionTypes';
import { IRelease } from './types';

export interface IAppReleaseState {
  releases: IRelease[];
  error: Error;
}

const initialState: IAppReleaseState = {
  releases: [],
  error: null,
};

const appReleaseReducer: Reducer<IAppReleaseState> = (
  state: IAppReleaseState = initialState,
  action?: Action,
): IAppReleaseState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case AppReleaseActionTypes.GET_APP_RELEASES_FULFILLED: {
      const { releases } = action as IGetReleaseActionFulfilled;
      return update<IAppReleaseState>(state, {
        releases: {
          $set: releases,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppReleaseActionTypes.GET_APP_RELEASES_REJECTED: {
      const { error } = action as IGetReleaseActionRejected;
      return update<IAppReleaseState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_RELEASE_FULFILLED: {
      return update<IAppReleaseState>(state, {
        error: {
          $set: null,
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_RELEASE_REJECTED: {
      const { error } = action as ICreateReleaseRejectedActions;
      return update<IAppReleaseState>(state, {
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

export default appReleaseReducer;
