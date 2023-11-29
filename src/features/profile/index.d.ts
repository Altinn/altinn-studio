import type { IProfile } from 'src/types/shared';

export interface IProfileState {
  profile?: IProfile;
}

export interface IFetchProfileFulfilled {
  profile: IProfile;
}
