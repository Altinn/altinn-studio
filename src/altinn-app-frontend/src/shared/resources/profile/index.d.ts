import type { IProfile } from 'altinn-shared/types';

export interface IProfileState {
  profile: IProfile;
  error: Error | null;
}

export interface IFetchProfile {
  url: string;
}

export interface IFetchProfileFulfilled {
  profile: IProfile;
}

export interface IFetchProfileRejected {
  error: Error | null;
}
