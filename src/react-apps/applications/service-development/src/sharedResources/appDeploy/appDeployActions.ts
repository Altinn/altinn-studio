import { Action } from 'redux';
import * as AppDeploymentActionTypes from './appDeployActionTypes';
import { IDeployment } from './types';

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

export interface ICreateDeployment extends Action {
  tag_name: string;
  env_name: string;
}

export function createRelease(tagName: string, envName: string): ICreateDeployment {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT,
    tag_name: tagName,
    env_name: envName,
  };
}

export interface ICreateDeploymentFulfilled extends Action {
  id: string;
}

export function createReleaseFulfilled(id: string): ICreateDeploymentFulfilled {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED,
    id,
  };
}

export interface ICreateDeploymentRejected extends Action {
  error: Error;
}

export function createReleaseRejected(error: Error): ICreateDeploymentRejected {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_REJECTED,
    error,
  };
}
