import { Action } from 'redux';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import { IDeploymentResults } from '../types';

export function getAppDeployments(): Action {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS,
  };
}

export interface IGetAppDeploymentsFulfilled extends Action {
  deployments: IDeploymentResults;
}

export function getAppDeploymentsFulfilled(deployments: IDeploymentResults): IGetAppDeploymentsFulfilled {
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

export function getAppDeploymentsStartInterval(): Action {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_START_INTERVAL,
  };
}

export function getAppDeploymentsStopInterval(): Action {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_STOP_INTERVAL,
  };
}
