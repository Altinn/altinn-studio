import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import fallbackLanguage from 'app-shared/fallbackLanguage';
import type { IFormDesignerActionRejected } from '../../../types/global';

export interface ILanguageState {
  language: any;
  error: Error;
}

const initialState: ILanguageState = {
  language: fallbackLanguage,
  error: null,
};

export interface IFetchLanguage {
  languageCode: string;
}

export interface IFetchLanguageFulfilled {
  language: any;
}

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchLanguage: (state, action: PayloadAction<IFetchLanguage>) => {},
    fetchLanguageFulfilled: (
      state,
      action: PayloadAction<IFetchLanguageFulfilled>,
    ) => {
      const { language } = action.payload;
      state.language = language;
      state.error = null;
    },
    fetchLanguageRejected: (
      state,
      action: PayloadAction<IFormDesignerActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const { fetchLanguage, fetchLanguageFulfilled, fetchLanguageRejected } =
  languageSlice.actions;

export default languageSlice.reducer;
