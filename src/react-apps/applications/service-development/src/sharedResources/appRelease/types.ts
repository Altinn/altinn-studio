export enum BuildStatus {
  cancelling = 'cancelling',
  completed = 'completed',
  inProgress = 'inProgress',
  none = 'none',
  notStarted = 'notStarted',
  postposed = 'postponed'
}

export interface IBuild {
  id: string;
  status: BuildStatus;
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
