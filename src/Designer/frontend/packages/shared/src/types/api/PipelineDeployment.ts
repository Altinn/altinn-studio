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
  eventType: EventType | SucceededEventType | FailedEventType;
  created: Date;
  origin: 'Internal' | 'Webhook' | 'PollingJob';
};

export enum EventType {
  DeprecatedPipelineScheduled = 'DeprecatedPipelineScheduled',
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
  const lastEvent = deployment?.events[deployment.events.length - 1];
  const lastEventType = lastEvent?.eventType;
  if (lastEventType) {
    if (succeededEventTypeValues.includes(lastEventType as SucceededEventType)) {
      return BuildResult.succeeded;
    } else if (failedEventTypeValues.includes(lastEventType as FailedEventType)) {
      return BuildResult.failed;
    } else {
      const firstEventType = deployment?.events[0]?.eventType;

      if (
        (lastEventType === EventType.PipelineSucceeded ||
          lastEventType === EventType.PipelineFailed) &&
        (firstEventType === EventType.DeprecatedPipelineScheduled ||
          new Date().getTime() - lastEvent.created.getTime() > 15 * 60 * 1000)
      ) {
        return lastEventType === EventType.PipelineSucceeded
          ? BuildResult.succeeded
          : BuildResult.failed;
      }

      return BuildResult.none;
    }
  } else {
    return deployment?.build.result;
  }
};
