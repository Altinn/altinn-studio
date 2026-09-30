import type { DeployAppStatus } from '../AppStatus';

export type CreateDeploymentPayload = {
  envName: string;
  tagName: string;
  appStatus?: DeployAppStatus;
};
