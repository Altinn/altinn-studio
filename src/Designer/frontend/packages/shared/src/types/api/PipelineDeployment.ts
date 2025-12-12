import { BuildResult, type Build } from '../Build';

export interface PipelineDeployment {
  id: string;
  deploymentType: 'Decommission' | 'Deploy';
  tagName: string;
  app: string;
  org: string;
  envName: string;
  createdBy: string;
  created: string;
  build: Build;
  events: DeployEvent[];
}

export type DeployEvent = {
  message: string;
  timestamp: string;
  eventType: InProgressEventType | SucceededEventType | FailedEventType;
  created: string;
  origin: 'Internal' | 'Webhook' | 'PollingJob';
};

export enum InProgressEventType {
  PipelineScheduled = 'PipelineScheduled',
  PipelineSucceeded = 'PipelineSucceeded',
  PipelineFailed = 'PipelineFailed',
}

export enum SucceededEventType {
  InstallSucceeded = 'InstallSucceeded',
  UpgradeSucceeded = 'UpgradeSucceeded',
  UninstallSucceeded = 'UninstallSucceeded',
}

export enum FailedEventType {
  InstallFailed = 'InstallFailed',
  UpgradeFailed = 'UpgradeFailed',
  UninstallFailed = 'UninstallFailed',
}

const succeededEventTypeValues = Object.values(SucceededEventType);
const failedEventTypeValues = Object.values(FailedEventType);

export const getDeployStatus = (deployment: PipelineDeployment | undefined): BuildResult => {
  const lastEventType = deployment?.events[deployment.events.length - 1]?.eventType;
  if (lastEventType) {
    if (succeededEventTypeValues.includes(lastEventType as SucceededEventType)) {
      return BuildResult.succeeded;
    } else if (failedEventTypeValues.includes(lastEventType as FailedEventType)) {
      return BuildResult.failed;
    } else {
      return BuildResult.none;
    }
  } else {
    return deployment?.build.result;
  }
};
