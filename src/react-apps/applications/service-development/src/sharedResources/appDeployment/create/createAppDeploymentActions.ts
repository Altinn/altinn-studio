import { Action } from 'redux';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import { IDeployment } from '../types';

export interface ICreateAppDeployment extends Action {
  tag_name: string;
  env_name: string;
}

export function createAppDeployment(tagName: string, envName: string): ICreateAppDeployment {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT,
    tag_name: tagName,
    env_name: envName,
  };
}

export interface ICreateAppDeploymentFulfilled extends Action {
  result: IDeployment;
}

export function createAppDeploymentFulfilled(result: IDeployment): ICreateAppDeploymentFulfilled {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED,
    result,
  };
}

export interface ICreateAppDeploymentRejected extends Action {
  error: Error;
}

export function createAppDeploymentRejected(error: Error): ICreateAppDeploymentRejected {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_REJECTED,
    error,
  };
}
