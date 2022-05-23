import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ILanguage } from 'altinn-shared/types';

export interface IFetchLanguageFulfilled {
  language: ILanguage;
}
export interface IFetchLanguageRejected {
  error: Error;
}

export interface ILanguageState {
  language: ILanguage;
  error: Error;
}

export const initialState: ILanguageState = {
  language: null,
  error: null,
};

const moduleName = 'language';
const languageSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchLanguageFulfilled: (state, action: PayloadAction<IFetchLanguageFulfilled>) => {
      const { language } = action.payload;
      state.language = language;
    },
    fetchLanguageRejected: (state, action: PayloadAction<IFetchLanguageRejected>) => {
      const { error } = action.payload;
      state.error = error;
    }
  }
});

const actions = {
  fetchLanguage: createAction(`${moduleName}/fetchLanguage`),
  fetchDefaultLanguage: createAction(`${moduleName}/fetchDefaultLanguage`),
};

export const LanguageActions = {
  ...actions,
  ...languageSlice.actions,
}

export default languageSlice.reducer;
