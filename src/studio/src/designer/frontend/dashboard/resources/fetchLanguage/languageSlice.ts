import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IFetchedLanguageState {
  language: any;
}

const initialState: IFetchedLanguageState = {
  language: {},
};

export interface IFetchLanguageAction {
  url: string;
}
export interface IFetchLanguageFulfilled {
  language: any;
}
export interface IFetchLanguageRejected {
  error: Error;
}

const moduleName = 'language';
const languageSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchLanguageFulfilled: (
      state,
      action: PayloadAction<IFetchLanguageFulfilled>,
    ) => {
      const { language } = action.payload;
      state.language = language;
    },
  },
});

export const fetchLanguage = createAction<IFetchLanguageAction>(
  `${moduleName}/fetchLanguage`,
);
export const fetchLanguageRejected = createAction<IFetchLanguageRejected>(
  `${moduleName}/fetchLanguageRejected`,
);

export const { fetchLanguageFulfilled } = languageSlice.actions;

export default languageSlice.reducer;
