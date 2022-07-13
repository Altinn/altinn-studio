import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type { IProfile } from 'altinn-shared/types';
import type {
  IProfileState,
  IFetchProfileFulfilled,
  IFetchProfileRejected,
  IFetchProfile,
} from '.';

const initialState: IProfileState = {
  profile: {
    profileSettingPreference: {
      language: 'nb',
    },
  } as IProfile,
  error: null,
};

const name = 'profile';
const profileSlice = createSlice({
  name,
  initialState,
  reducers: {
    fetchFulfilled: (state, action: PayloadAction<IFetchProfileFulfilled>) => {
      state.profile = action.payload.profile;
    },
    fetchRejected: (state, action: PayloadAction<IFetchProfileRejected>) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  fetch: createAction<IFetchProfile>(`${name}/fetch`),
};

export const ProfileActions = {
  ...profileSlice.actions,
  ...actions,
};
export default profileSlice;
