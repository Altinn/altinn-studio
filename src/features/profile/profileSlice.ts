import { put } from 'redux-saga/effects';

import { OptionsActions } from 'src/features/options/optionsSlice';
import { createSagaSlice } from 'src/redux/sagaSlice';
import { getLanguageQueryParam } from 'src/utils/party';
import type { IFetchProfileFulfilled, IFetchProfileRejected, IProfileState } from 'src/features/profile/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { IProfile } from 'src/types/shared';

export interface IUpdateSelectedAppLanguage {
  selected: string;
}

const getLanguageStorageKey = (userId: number | undefined) => `selectedAppLanguage${window.app}${userId ?? ''}`;

export const initialState: IProfileState = {
  profile: {
    profileSettingPreference: {
      language: 'nb',
    },
  } as IProfile,
  selectedAppLanguage: localStorage.getItem(getLanguageStorageKey(undefined)) ?? '',
  error: null,
};

export let ProfileActions: ActionsFromSlice<typeof profileSlice>;
export const profileSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IProfileState>) => ({
    name: 'profile',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFetchProfileFulfilled>({
        reducer: (state, action) => {
          state.profile = action.payload.profile;
          state.selectedAppLanguage =
            getLanguageQueryParam() ?? localStorage.getItem(getLanguageStorageKey(state.profile.userId)) ?? '';
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

  ProfileActions = slice.actions;
  return slice;
};
