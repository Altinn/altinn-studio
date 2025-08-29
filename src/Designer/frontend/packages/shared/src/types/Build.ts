export enum BuildStatus {
  cancelling = 'cancelling',
  completed = 'completed',
  inProgress = 'inProgress',
  none = 'none',
  notStarted = 'notStarted',
  postponed = 'postponed',
}

export enum BuildResult {
  canceled = 'canceled',
  failed = 'failed',
  none = 'none',
  partiallySucceeded = 'partiallySucceeded',
  succeeded = 'succeeded',
}

export interface Build {
  id: string;
  status: BuildStatus;
  result: BuildResult;
  started: string;
  finished: string;
}
