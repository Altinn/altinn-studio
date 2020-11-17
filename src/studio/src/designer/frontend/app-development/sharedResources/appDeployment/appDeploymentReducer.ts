import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDeploymentActionTypes from './appDeploymentActionTypes';
import { ICreateAppDeploymentFulfilled, ICreateAppDeploymentRejected } from './create/createAppDeploymentActions';
import { IGetAppDeploymentsFulfilled, IGetAppDeploymentsRejected } from './get/getAppDeploymentActions';
import { IDeployment } from './types';

export interface IAppDeploymentState {
  deployments: IDeployment[];
  getAppDeploymentsError: Error;
  createAppDeploymentErrors: ICreateAppDeploymentErrors[];
}

export interface ICreateAppDeploymentErrors {
  env: string;
  errorMessage: string;
  errorCode: string;
}

const initialState: IAppDeploymentState = {
  deployments: [],
  getAppDeploymentsError: null,
  createAppDeploymentErrors: [],
};

update.extend('$updateCreateAppDeploymentError', (params: any, original: any) => {
  const newState = original.filter((elem: any) => elem.env !== params.env);

  const newAppDeploymentError: ICreateAppDeploymentErrors = {
    env: params.env,
    errorMessage: params.error ? params.error.message : null,
    errorCode: params.error ? params.error.response.status : null,
  };

  newState.push(newAppDeploymentError);
  return newState;
});

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
          $set: deployments.results,
        },
        getAppDeploymentsError: {
          $set: null,
        },
      });
    }
    case AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_REJECTED: {
      const { error } = action as IGetAppDeploymentsRejected;
      return update<IAppDeploymentState>(state, {
        getAppDeploymentsError: {
          $set: error.message,
        },
      });
    }
    case AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED: {
      const { result, envName } = action as ICreateAppDeploymentFulfilled;
      return update<IAppDeploymentState>(state, {
        deployments: {
          $unshift: [result],
        },
        createAppDeploymentErrors: {
          $updateCreateAppDeploymentError: {
            env: envName,
            error: null,
          },
        },
      });
    }
    case AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_REJECTED: {
      const { error, envName } = action as ICreateAppDeploymentRejected;
      return update<IAppDeploymentState>(state, {
        createAppDeploymentErrors: {
          $updateCreateAppDeploymentError: {
            env: envName,
            error,
          },
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default appDeploymentReducer;
