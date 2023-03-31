import { call, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { fetchLanguageSaga, watchFetchLanguageSaga } from 'src/features/language/fetch/fetchLanguageSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { ILanguage } from 'src/types/shared';

export interface IFetchLanguageFulfilled {
  language: ILanguage;
}

export interface IFetchLanguageRejected {
  error: Error;
}

export interface ILanguageState {
  language: ILanguage | null;
  error: Error | null;
}

export const initialState: ILanguageState = {
  language: null,
  error: null,
};

export let LanguageActions: ActionsFromSlice<typeof languageSlice>;
export const languageSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<ILanguageState>) => ({
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
    },
  }));

  LanguageActions = slice.actions;
  return slice;
};
