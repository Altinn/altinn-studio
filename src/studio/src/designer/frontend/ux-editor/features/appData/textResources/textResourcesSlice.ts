import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ITextResource } from '../../../types/global';

export interface ILoadTextResources {
  url: string;
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

export interface ITextResourcesState {
  resources: ITextResource[];
  language: string;
  fetching: boolean;
  fetched: boolean;
  saving: boolean;
  saved: boolean;
  error: Error;
}

const initialState: ITextResourcesState = {
  resources: [],
  language: null,
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
      state.resources = textResources.resources;
      state.language = textResources.language;
      state.fetched = true;
      state.fetching = false;
    },
    loadTextResourcesRejected: (state, action: PayloadAction<ILoadTextResourcesRejected>) => {
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
  },
});

export const {
  loadTextResources,
  loadTextResourcesFulfilled,
  loadTextResourcesRejected,
  addTextResources,
  addTextResourcesFulfilled,
  addTextResourcesRejected,
} = textResourcesSlice.actions;

export default textResourcesSlice.reducer;
