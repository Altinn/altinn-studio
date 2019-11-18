import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppReleaseActionTypes from './appReleaseActionTypes';
import { ICreateReleaseFulfilledAction, ICreateReleaseRejectedActions } from './create/createAppReleaseActions';
import { IGetReleaseActionFulfilled, IGetReleaseActionRejected } from './get/getAppReleasesActions';
import { IAppReleaseErrors, IRelease } from './types';

export interface IAppReleaseState {
  releases: IRelease[];
  creatingRelease: boolean;
  errors: IAppReleaseErrors;
}

const initialState: IAppReleaseState = {
  releases: [],
  creatingRelease: false,
  errors: {
    createReleaseErrorCode: null,
    fetchReleaseErrorCode: null,
  },
};

update.extend<IRelease[]>('$addFirstIndex', (param: IRelease, old: IRelease[]) => {
  return new Array().concat(param, ...old);
});

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
        errors: {
          fetchReleaseErrorCode: {
            $set: null,
          },
        },
      });
    }
    case AppReleaseActionTypes.GET_APP_RELEASES_REJECTED: {
      const { errorCode } = action as IGetReleaseActionRejected;
      return update<IAppReleaseState>(state, {
        errors: {
          fetchReleaseErrorCode: {
            $set: errorCode,
          },
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_RELEASE: {
      return update<IAppReleaseState>(state, {
        creatingRelease: {
          $set: true,
        },
        errors: {
          createReleaseErrorCode: {
            $set: null,
          },
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_RELEASE_FULFILLED: {
      const { release } = action as ICreateReleaseFulfilledAction;
      return update<IAppReleaseState>(state, {
        releases: {
          $addFirstIndex: release,
        },
        creatingRelease: {
          $set: false,
        },
        errors: {
          createReleaseErrorCode: {
            $set: null,
          },
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_RELEASE_REJECTED: {
      const { errorCode } = action as ICreateReleaseRejectedActions;
      return update<IAppReleaseState>(state, {
        errors: {
          createReleaseErrorCode: {
            $set: errorCode,
          },
        },
        creatingRelease: {
          $set: false,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default appReleaseReducer;
