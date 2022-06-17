import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ILanguage } from 'altinn-shared/types';
import { IAltinnWindow } from 'src/types';

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
  language: ILanguage;
  selectedAppLanguage: string;
  error: Error;
}

const altinnWindow = window as Window as IAltinnWindow;
const { app } = altinnWindow;
const localStorageSlectedAppLanguageKey = `selectedAppLanguage${app}`;

export const initialState: ILanguageState = {
  language: null,
  selectedAppLanguage: localStorage.getItem(localStorageSlectedAppLanguageKey) || '',
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
    },
    updateSelectedAppLanguage: (state, action: PayloadAction<IUpdateSelectedAppLanguage>)=>{
      const { selected } = action.payload;
      localStorage.setItem(localStorageSlectedAppLanguageKey, selected);
      state.selectedAppLanguage = selected;
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
