import { put } from 'redux-saga/effects';

import { OptionsActions } from 'src/shared/resources/options/optionsSlice';
import { fetchProfileSaga } from 'src/shared/resources/profile/fetch/fetchProfileSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IFetchProfile,
  IFetchProfileFulfilled,
  IFetchProfileRejected,
  IProfileState,
} from 'src/shared/resources/profile';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import type { IAltinnWindow } from 'src/types';
import type { IProfile } from 'src/types/shared';

export interface IUpdateSelectedAppLanguage {
  selected: string;
}

const altinnWindow = window as Window as IAltinnWindow;
const getLanguageStorageKey = (userId: number | undefined) => `selectedAppLanguage${altinnWindow.app}${userId ?? ''}`;

export const initialState: IProfileState = {
  profile: {
    profileSettingPreference: {
      language: 'nb',
    },
  } as IProfile,
  selectedAppLanguage: localStorage.getItem(getLanguageStorageKey(undefined)) ?? '',
  error: null,
};

export const profileSlice = createSagaSlice((mkAction: MkActionType<IProfileState>) => ({
  name: 'profile',
  initialState,
  actions: {
    fetch: mkAction<IFetchProfile>({
      takeLatest: fetchProfileSaga,
    }),
    fetchFulfilled: mkAction<IFetchProfileFulfilled>({
      reducer: (state, action) => {
        state.profile = action.payload.profile;
        state.selectedAppLanguage = localStorage.getItem(getLanguageStorageKey(state.profile.userId)) ?? '';
      },
    }),
    fetchRejected: mkAction<IFetchProfileRejected>({
      reducer: (state, action) => {
        state.error = action.payload.error;
      },
    }),
    updateSelectedAppLanguage: mkAction<IUpdateSelectedAppLanguage>({
      *takeLatest() {
        yield put(OptionsActions.fetch());
      },
      reducer: (state, action) => {
        const { selected } = action.payload;
        localStorage.setItem(getLanguageStorageKey(state.profile.userId), selected);
        state.selectedAppLanguage = selected;
      },
    }),
  },
}));

export const ProfileActions = profileSlice.actions;
