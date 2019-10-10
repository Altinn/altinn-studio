import { Action } from 'redux';
import * as AppDeploymentActionTypes from '../appDeployActionTypes';
import { IDeployment } from '../types';

export function getDeployments(): Action {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS,
  };
}

export interface IGetDeploymentsFulfilled extends Action {
  deployments: IDeployment[];
}

export function getDeploymentsFulfilled(deployments: IDeployment[]): IGetDeploymentsFulfilled {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_FULFILLED,
    deployments,
  };
}

export interface IGetDeploymentsRejected extends Action {
  error: Error;
}

export function getDeploymentsRejected(error: Error): IGetDeploymentsRejected {
  return {
    type: AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_REJECTED,
    error,
  };
}
