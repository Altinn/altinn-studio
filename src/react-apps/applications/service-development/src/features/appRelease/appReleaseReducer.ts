import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import {
  ICreateReleaseRejectedActions,
  IFetchReleaseActionFulfilled,
  IFetchReleaseActionRejected,
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
    case AppReleaseActionTypes.FETCH_APP_DEPLOYMENTS_FULFILLED: {
      const { releases } = action as IFetchReleaseActionFulfilled;
      return update<IAppReleaseState>(state, {
        releases: {
          $set: releases,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppReleaseActionTypes.FETCH_APP_DEPLOYMENTS_REJECTED: {
      const { error } = action as IFetchReleaseActionRejected;
      return update<IAppReleaseState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_DEPLOTMENT_REJECTED: {
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
