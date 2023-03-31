import type { IProfile } from 'src/types/shared';

export interface IProfileState {
  profile: IProfile;
  selectedAppLanguage: string;
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
