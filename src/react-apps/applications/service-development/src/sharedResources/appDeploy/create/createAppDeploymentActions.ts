import { Action } from 'redux';
import * as AppDeploymentActionTypes from '../appDeployActionTypes';

export interface ICreateDeployment extends Action {
  tag_name: string;
  env_name: string;
}

export function createDeployment(tagName: string, envName: string): ICreateDeployment {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT,
    tag_name: tagName,
    env_name: envName,
  };
}

export interface ICreateDeploymentFulfilled extends Action {
  id: string;
}

export function createDeploymentFulfilled(id: string): ICreateDeploymentFulfilled {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED,
    id,
  };
}

export interface ICreateDeploymentRejected extends Action {
  error: Error;
}

export function createDeploymentRejected(error: Error): ICreateDeploymentRejected {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_REJECTED,
    error,
  };
}
