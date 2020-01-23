import { Action } from 'redux';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import { IDeployment } from '../types';

export interface ICreateAppDeployment extends Action {
  tagName: string;
  envObj: ICreateAppDeploymentEnvObject;
}

export interface ICreateAppDeploymentEnvObject {
  'hostname': string;
  'app': string;
  'platformPrefix': string;
  'name': string;
  'type': string;
}

export function createAppDeployment(tagName: string, envObj: ICreateAppDeploymentEnvObject): ICreateAppDeployment {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT,
    tagName,
    envObj,
  };
}

export interface ICreateAppDeploymentFulfilled extends Action {
  result: IDeployment;
  envName: string;
}

export function createAppDeploymentFulfilled(result: IDeployment, envName: string): ICreateAppDeploymentFulfilled {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_FULFILLED,
    result,
    envName,
  };
}

export interface ICreateAppDeploymentRejected extends Action {
  error: Error;
  envName: string;
}

export function createAppDeploymentRejected(error: Error, envName: string): ICreateAppDeploymentRejected {
  return {
    type: AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT_REJECTED,
    error,
    envName,
  };
}
