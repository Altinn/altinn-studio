export enum PipelineDeploymentBuildStatus {
  cancelling = 'cancelling',
  completed = 'completed',
  inProgress = 'inProgress',
  none = 'none',
  notStarted = 'notStarted',
  postponed = 'postponed',
}

export enum PipelineDeploymentBuildResult {
  canceled = 'canceled',
  failed = 'failed',
  none = 'none',
  partiallySucceeded = 'partiallySucceeded',
  succeeded = 'succeeded',
}

export interface PipelineDeploymentBuild {
  id: string;
  status: PipelineDeploymentBuildStatus;
  result: PipelineDeploymentBuildResult;
  started: string;
  finished: string;
}
