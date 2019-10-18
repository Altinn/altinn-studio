import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDeploymentActionTypes from './appDeploymentActionTypes';
import { ICreateAppDeploymentFulfilled, ICreateAppDeploymentRejected } from './create/createAppDeploymentActions';
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

const appDeploymentReducer: Reducer<IAppDeploymentState> = (
  state: IAppDeploymentState = initialState,
  action?: Action,
): IAppDeploymentState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_FULFILLED: {
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
    case AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_REJECTED: {
      const { error } = action as IGetAppDeploymentsRejected;
      return update<IAppDeploymentState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED: {
      const { result } = action as ICreateAppDeploymentFulfilled;
      return update<IAppDeploymentState>(state, {
        deployments: {
          $unshift: [result],
        },
        error: {
          $set: null,
        },
      });
    }
    case AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_REJECTED: {
      const { error } = action as ICreateAppDeploymentRejected;
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

export default appDeploymentReducer;
