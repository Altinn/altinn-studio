import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ITextResource } from '../../../types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export interface ILoadTextResources {
  textResourcesUrl: (langCode: string) => string;
  languagesUrl: string;
}

export interface ILoadTextResourcesAction {
  type: string;
  payload: ILoadTextResources;
}

export interface ILoadTextResourcesFulfilled {
  textResources: any;
}

export interface ILoadTextResourcesRejected {
  error: Error;
}

export interface ILoadLanguages {
  url: string;
}

export interface ILoadLanguagesAction {
  type: string;
  payload: ILoadLanguages;
}

export interface ILoadLanguagesFulfilled {
  languages: string[];
}

export interface ILoadLanguagesRejected {
  error: Error;
}

export interface ITextResources {
  [langCode: string]: ITextResource[];
}

export interface IUpsertTextResources {
  language: string;
  textResources: { [id: string]: string };
}

export interface IUpsertTextResourcesFulfilled {
  textResources: any;
}

export interface IUpsertTextResourcesRejected {
  error: Error;
}

export interface ITextResourcesState {
  resources: ITextResources;
  language: string;
  languages: string[];
  fetching: boolean;
  fetched: boolean;
  saving: boolean;
  saved: boolean;
  error: Error;
  currentEditId?: string;
}

const initialState: ITextResourcesState = {
  resources: {[DEFAULT_LANGUAGE]: []},
  language: null,
  languages: [],
  fetching: false,
  fetched: false,
  saving: false,
  saved: false,
  error: null,
};

const textResourcesSlice = createSlice({
  name: 'textResources',
  initialState,
  reducers: {
    loadTextResources: (state, _action: PayloadAction<ILoadTextResources>) => {
      state.fetched = false;
      state.fetching = true;
      state.error = null;
    },
    loadTextResourcesFulfilled: (state, action: PayloadAction<ILoadTextResourcesFulfilled>) => {
      const { textResources } = action.payload;
      state.resources = textResources;
      state.fetched = true;
      state.fetching = false;
    },
    loadTextResourcesRejected: (state, action: PayloadAction<ILoadTextResourcesRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.fetched = false;
      state.fetching = false;
    },
    loadLanguages: (state, _action: PayloadAction<ILoadLanguages>) => {
      state.fetched = false;
      state.fetching = true;
      state.error = null;
    },
    loadLanguagesFulfilled: (state, action: PayloadAction<ILoadLanguagesFulfilled>) => {
      const { languages } = action.payload;
      state.languages = languages;
      state.fetched = true;
      state.fetching = false;
    },
    loadLanguagesRejected: (state, action: PayloadAction<ILoadLanguagesRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.fetched = false;
      state.fetching = false;
    },
    addTextResources: (state, _action) => {
      state.saving = true;
      state.saved = false;
      state.error = null;
    },
    addTextResourcesFulfilled: (state) => {
      state.saving = false;
      state.saved = true;
      state.error = null;
    },
    addTextResourcesRejected: (state, action: PayloadAction<ILoadTextResourcesRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.saving = false;
      state.saved = false;
    },
    upsertTextResources: (state, action: PayloadAction<IUpsertTextResources>) => {
      const { payload } = action;
      const { language, textResources } = payload;

      // Remove old texts
      state.resources[language] = state.resources[language].filter(({id}) => !textResources[id]);

      // Add new texts (it is not sufficient to iterate through the IDs of state.resources[language] because there might be new IDs)
      Object.keys(textResources).forEach((id) => {
        const newTextResource = { id, value: textResources[id] };
        state.resources[language].push(newTextResource);
      });

      state.fetched = false;
      state.fetching = true;
      state.error = null;
    },
    upsertTextResourcesFulfilled: (state, _action: PayloadAction<IUpsertTextResourcesFulfilled>) => {
      state.fetched = true;
      state.fetching = false;
    },
    upsertTextResourcesRejected: (state, action: PayloadAction<IUpsertTextResourcesRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.fetched = false;
      state.fetching = false;
    },
    setCurrentEditId: (state, action: PayloadAction<string>) => {
      const { payload } = action;
      state.currentEditId = payload;
    }
  },
});

export const {
  loadTextResources,
  loadTextResourcesFulfilled,
  loadTextResourcesRejected,
  loadLanguages,
  loadLanguagesFulfilled,
  loadLanguagesRejected,
  addTextResources,
  addTextResourcesFulfilled,
  addTextResourcesRejected,
  upsertTextResources,
  upsertTextResourcesFulfilled,
  upsertTextResourcesRejected,
  setCurrentEditId,
} = textResourcesSlice.actions;

export default textResourcesSlice.reducer;
