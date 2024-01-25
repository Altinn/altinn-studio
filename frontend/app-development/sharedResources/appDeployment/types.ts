import type { AxiosError } from 'axios';
import type { DeploymentStatus } from '../../features/appPublish/components/appDeploymentComponent';

export interface IBuild {
  id: string;
  status: string | number;
  result: DeploymentStatus | string | number;
  started: string;
  finished: string;
}

export interface ICreateAppDeployment {
  tagName: string;
  envName: string;
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
  appPrefix: string;
  hostname: string;
  name: string;
  platformPrefix: string;
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
  deployedInEnv: boolean;
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
