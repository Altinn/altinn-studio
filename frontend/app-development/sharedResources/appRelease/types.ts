import type { AppRelease } from 'app-shared/types/AppRelease';

export interface ICreateReleaseAction {
  tagName: string;
  name: string;
  body: string;
  targetCommitish: string;
}

export interface ICreateReleaseFulfilledAction {
  release: AppRelease;
}

export interface ICreateReleaseRejectedActions {
  errorCode: number;
}

export interface IGetReleaseActionFulfilled {
  releases: AppRelease[];
}

export interface IGetReleaseActionRejected {
  errorCode: number;
}

export interface IAppReleaseErrors {
  createReleaseErrorCode: number;
  fetchReleaseErrorCode: number;
}
