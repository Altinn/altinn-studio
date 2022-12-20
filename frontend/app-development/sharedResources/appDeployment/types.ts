import type { AxiosError } from 'axios';

export interface IBuild {
  id: string;
  status: string | number;
  result: string | number;
  started: string;
  finished: string;
}

export interface ICreateAppDeployment {
  tagName: string;
  envObj: ICreateAppDeploymentEnvObject;
}

export interface ICreateAppDeploymentFulfilled {
  result: IDeployment;
  envName: string;
}

export interface ICreateAppDeploymentRejected {
  error: AxiosError;
  envName: string;
}

export interface ICreateAppDeploymentEnvObject {
  hostname: string;
  app: string;
  platformPrefix: string;
  name: string;
  type: string;
}

export interface ICreateAppDeploymentErrors {
  env: string;
  errorMessage: string;
  errorCode: string;
}

export interface IDeployment {
  id: string;
  tagName: string;
  app: string;
  org: string;
  envName: string;
  createdBy: string;
  created: string;
  build: IBuild;
}

export interface IDeploymentResults {
  results: IDeployment[];
}

export interface IGetAppDeploymentsFulfilled {
  deployments: IDeploymentResults;
}

export interface IGetAppDeploymentsRejected {
  error: Error;
}
