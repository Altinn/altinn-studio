import { Action } from 'redux';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import { IDeployment } from '../types';

export function getAppDeployments(): Action {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS,
  };
}

export interface IGetAppDeploymentsFulfilled extends Action {
  deployments: IDeployment[];
}

export function getAppDeploymentsFulfilled(deployments: IDeployment[]): IGetAppDeploymentsFulfilled {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_FULFILLED,
    deployments,
  };
}

export interface IGetAppDeploymentsRejected extends Action {
  error: Error;
}

export function getAppDeploymentsRejected(error: Error): IGetAppDeploymentsRejected {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_REJECTED,
    error,
  };
}
