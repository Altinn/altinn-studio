import type { BuildAppStatus } from '../AppStatus';

export type CreateReleasePayload = {
  tagName: string;
  name: string;
  body: string;
  targetCommitish: string;
  appStatus?: BuildAppStatus;
};
