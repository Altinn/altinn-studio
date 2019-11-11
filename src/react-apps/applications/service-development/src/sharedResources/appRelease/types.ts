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

export interface IBuild {
  id: string;
  status: BuildStatus;
  result: BuildResult;
  started: string;
  finished: string;
}

export interface IRelease {
  id: string;
  tagName: string;
  name: string;
  body: string;
  app: string;
  org: string;
  targetCommitish: string;
  createdBy: string;
  created: string;
  build: IBuild;
}

export interface IAppReleaseErrors {
  createReleaseErrorCode: number;
  fetchReleaseErrorCode: number;
}
