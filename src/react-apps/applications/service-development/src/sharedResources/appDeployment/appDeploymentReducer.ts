import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppReleaseActionTypes from './appDeploymentActionTypes';
import { ICreateDeploymentRejected } from './create/createAppDeploymentActions';
import { IGetAppDeploymentsFulfilled, IGetAppDeploymentsRejected } from './get/getAppDeploymentActions';
import { IDeployment } from './types';

export interface IAppDeploymentState {
  deployments: IDeployment[];
  error: Error;
}

const initialState: IAppDeploymentState = {
  deployments: [],
  error: null,
};

const appReleaseReducer: Reducer<IAppDeploymentState> = (
  state: IAppDeploymentState = initialState,
  action?: Action,
): IAppDeploymentState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case AppReleaseActionTypes.GET_APP_DEPLOYMENTS_FULFILLED: {
      const { deployments } = action as IGetAppDeploymentsFulfilled;
      return update<IAppDeploymentState>(state, {
        deployments: {
          $set: deployments,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppReleaseActionTypes.GET_APP_DEPLOYMENTS_REJECTED: {
      const { error } = action as IGetAppDeploymentsRejected;
      return update<IAppDeploymentState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED: {
      return update<IAppDeploymentState>(state, {
        error: {
          $set: null,
        },
      });
    }
    case AppReleaseActionTypes.CREATE_APP_DEPLOYMENT_REJECTED: {
      const { error } = action as ICreateDeploymentRejected;
      return update<IAppDeploymentState>(state, {
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
