import type { IProfile } from 'altinn-shared/types';
import type {
  IProfileState,
  IFetchProfileFulfilled,
  IFetchProfileRejected,
  IFetchProfile,
} from '.';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import { fetchProfileSaga } from 'src/shared/resources/profile/fetch/fetchProfileSagas';

const initialState: IProfileState = {
  profile: {
    profileSettingPreference: {
      language: 'nb',
    },
  } as IProfile,
  error: null,
};

const profileSlice = createSagaSlice(
  (mkAction: MkActionType<IProfileState>) => ({
    name: 'profile',
    initialState,
    actions: {
      fetch: mkAction<IFetchProfile>({
        takeLatest: fetchProfileSaga,
      }),
      fetchFulfilled: mkAction<IFetchProfileFulfilled>({
        reducer: (state, action) => {
          state.profile = action.payload.profile;
        },
      }),
      fetchRejected: mkAction<IFetchProfileRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }),
);

export const ProfileActions = profileSlice.actions;
export default profileSlice;
