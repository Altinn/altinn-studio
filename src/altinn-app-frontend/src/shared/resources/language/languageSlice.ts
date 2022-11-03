import { call, put, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { fetchLanguageSaga, watchFetchLanguageSaga } from 'src/shared/resources/language/fetch/fetchLanguageSagas';
import { OptionsActions } from 'src/shared/resources/options/optionsSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import type { IAltinnWindow } from 'src/types';

import type { ILanguage } from 'altinn-shared/types';

export interface IFetchLanguageFulfilled {
  language: ILanguage;
}
export interface IFetchLanguageRejected {
  error: Error;
}
export interface IUpdateSelectedAppLanguage {
  selected: string;
}

export interface ILanguageState {
  language: ILanguage | null;
  selectedAppLanguage: string;
  error: Error | null;
}

const altinnWindow = window as Window as IAltinnWindow;
const { app } = altinnWindow;
const localStorageSlectedAppLanguageKey = `selectedAppLanguage${app}`;

export const initialState: ILanguageState = {
  language: null,
  selectedAppLanguage: localStorage.getItem(localStorageSlectedAppLanguageKey) || '',
  error: null,
};

const languageSlice = createSagaSlice((mkAction: MkActionType<ILanguageState>) => ({
  name: 'language',
  initialState,
  actions: {
    fetchLanguage: mkAction<void>({
      saga: () => watchFetchLanguageSaga,
    }),
    fetchDefaultLanguage: mkAction<void>({
      saga: (name) =>
        function* (): SagaIterator {
          yield take(name);
          yield call(fetchLanguageSaga, true);
        },
    }),
    fetchLanguageFulfilled: mkAction<IFetchLanguageFulfilled>({
      reducer: (state, action) => {
        const { language } = action.payload;
        state.language = language;
      },
    }),
    fetchLanguageRejected: mkAction<IFetchLanguageRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    updateSelectedAppLanguage: mkAction<IUpdateSelectedAppLanguage>({
      takeLatest: function* () {
        yield put(OptionsActions.fetch());
      },
      reducer: (state, action) => {
        const { selected } = action.payload;
        localStorage.setItem(localStorageSlectedAppLanguageKey, selected);
        state.selectedAppLanguage = selected;
      },
    }),
  },
}));

export const LanguageActions = languageSlice.actions;

export default languageSlice;
