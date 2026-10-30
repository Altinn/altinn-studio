import { BuildResult, type Build } from '../Build';
import type { RunningApp } from './RunningApp';

export interface PipelineDeployment {
  id: string;
  deploymentType: 'Decommission' | 'Deploy';
  tagName: string;
  app: string;
  org: string;
  envName: string;
  createdBy: string;
  created: string;
  build?: Build;
  events: DeployEvent[];
}

export type DeployEvent = {
  message: string;
  timestamp: string;
  eventType: EventType | SucceededEventType | FailedEventType | WarningEventType;
  created: string;
  origin: 'Internal' | 'Webhook' | 'PollingJob';
};

export enum EventType {
  DeprecatedPipelineScheduled = 'DeprecatedPipelineScheduled',
  PipelineScheduled = 'PipelineScheduled',
  PipelineSucceeded = 'PipelineSucceeded',
  ResourceRegistryPublishSucceeded = 'ResourceRegistryPublishSucceeded',
}

export enum SucceededEventType {
  InstallSucceeded = 'InstallSucceeded',
  UpgradeSucceeded = 'UpgradeSucceeded',
  UninstallSucceeded = 'UninstallSucceeded',
}

export enum FailedEventType {
  PipelineFailed = 'PipelineFailed',
  InstallFailed = 'InstallFailed',
  UpgradeFailed = 'UpgradeFailed',
  UninstallFailed = 'UninstallFailed',
}

export enum WarningEventType {
  ResourceRegistryPublishFailed = 'ResourceRegistryPublishFailed',
}

const succeededEventTypeValues = Object.values(SucceededEventType);
const failedEventTypeValues = Object.values(FailedEventType);
const warningEventTypeValues = Object.values(WarningEventType);
const deploymentSchedulingGracePeriodMs = 5 * 60 * 1000;

const isResourceRegistryEventType = (eventType: DeployEvent['eventType']): boolean =>
  eventType === EventType.ResourceRegistryPublishSucceeded ||
  eventType === WarningEventType.ResourceRegistryPublishFailed;

export const getDeploymentWarnings = (
  deployment: PipelineDeployment | undefined,
): DeployEvent[] => {
  return (
    deployment?.events.filter((event) => {
      const eventType = event.eventType;
      if (warningEventTypeValues.includes(eventType as WarningEventType)) {
        return true;
      }
      return false;
    }) ?? []
  );
};

export const getDeployStatus = (deployment: PipelineDeployment | undefined): BuildResult => {
  const lastEvent = deployment?.events[deployment.events.length - 1];
  const lastEventType = lastEvent?.eventType;
  const warnings = getDeploymentWarnings(deployment);
  if (lastEventType) {
    const lastEventAgeMs = new Date().getTime() - new Date(lastEvent.created).getTime();

    if (
      isResourceRegistryEventType(lastEventType) &&
      !deployment?.build &&
      lastEventAgeMs > deploymentSchedulingGracePeriodMs
    ) {
      return BuildResult.failed;
    }

    if (succeededEventTypeValues.includes(lastEventType as SucceededEventType)) {
      if (warnings.length > 0) {
        return BuildResult.partiallySucceeded;
      }
      return BuildResult.succeeded;
    } else if (failedEventTypeValues.includes(lastEventType as FailedEventType)) {
      return BuildResult.failed;
    } else {
      const isDeprecatedPipeline = deployment?.events.some(
        (deployEvent) => deployEvent.eventType === EventType.DeprecatedPipelineScheduled,
      );

      if (
        lastEventType === EventType.PipelineSucceeded &&
        (isDeprecatedPipeline || lastEventAgeMs > 15 * 60 * 1000)
      ) {
        if (warnings.length > 0) {
          return BuildResult.partiallySucceeded;
        }
        return BuildResult.succeeded;
      }

      return BuildResult.none;
    }
  } else {
    return deployment?.build?.result;
  }
};

/**
 * The deploy whose build runs in the environment. Another Studio's deploy is not in this Studio's history. When it
 * is unknown which Studio deployed what runs, the tag is the best match there is, though the same tag can have been
 * deployed more than once.
 */
export const findRunningPipelineDeployment = (
  pipelineDeployments: PipelineDeployment[],
  runningApp: RunningApp | undefined,
): PipelineDeployment | undefined => {
  switch (runningApp?.deployedFromThisStudio) {
    case true:
      return pipelineDeployments.find((item) => item.build?.id === runningApp.buildId);
    case false:
      return undefined;
    default:
      return pipelineDeployments.find((item) => item.tagName === runningApp?.version);
  }
};
