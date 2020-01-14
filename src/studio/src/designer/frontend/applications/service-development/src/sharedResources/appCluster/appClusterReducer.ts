import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppClusterActionTypes from './appClusterActionTypes';
import * as AppClusterActions from './getDeployments/getDeploymentsInAppClusterActions';

export interface IAppClusterState {
  deploymentList: IEnvironmentItem[];
}

export interface IEnvironmentItem {
  env: string;
  items: any[];
  getStatus: IGetStatus;
}

interface IGetStatus {
  error?: Error;
  success?: boolean;
}

const initialState: IAppClusterState = {
  deploymentList: [],
};

update.extend('$updateEnvSuccess', (params: any, original: any) => {
  const newState = original.filter((elem: any) => elem.env !== params.env );

  const newDeploymentListItem: IEnvironmentItem = {
    env: params.env,
    items: params.result,
    getStatus: {
      error: null,
      success: true,
    },
  };

  newState.push(newDeploymentListItem);

  return newState;
});

update.extend('$updateEnvFailed', (params: any, original: any) => {
  const newState = original.filter((elem: any) => elem.env !== params.env );

  const newDeploymentListItem: IEnvironmentItem = {
    env: params.env,
    items: [],
    getStatus: {
      error: params.error.message,
      success: false,
    },
  };

  newState.push(newDeploymentListItem);

  return newState;
});

const appClusterReducer: Reducer<IAppClusterState> = (
  state: IAppClusterState = initialState,
  action?: Action,
): IAppClusterState => {
  if (!action) {
    return state;
  }
  switch (action.type) {

    case AppClusterActionTypes.GET_DEPLOYMENTS_FULFILLED: {
      const { result, env } = action as AppClusterActions.IGetDeploymentsFulfilled;
      return update<IAppClusterState>(state, {
        deploymentList: {
          $updateEnvSuccess: {
            result,
            env,
          },
        },
      });
    }

    case AppClusterActionTypes.GET_DEPLOYMENTS_REJECTED: {
      const { error, env } = action as AppClusterActions.IGetDeploymentsRejected;
      return update<IAppClusterState>(state, {
        deploymentList: {
          $updateEnvFailed: {
            error,
            env,
          },
        },
      });
    }

    default: { return state; }
  }
};

export default appClusterReducer;
