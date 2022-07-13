import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  ITextResourcesState,
  IFetchTextResourcesFulfilled,
  IFetchTextResourcesRejected,
  IReplaceTextResourcesFulfilled,
  IReplaceTextResourcesRejected,
} from 'src/shared/resources/textResources/index';

const initialState: ITextResourcesState = {
  language: null,
  resources: [],
  error: null,
};

const name = 'textResources';
const textResourcesSlice = createSlice({
  name,
  initialState,
  reducers: {
    fetchFulfilled: (
      state,
      action: PayloadAction<IFetchTextResourcesFulfilled>,
    ) => {
      state.language = action.payload.language;
      state.resources = action.payload.resources;
    },
    fetchRejected: (
      state,
      action: PayloadAction<IFetchTextResourcesRejected>,
    ) => {
      state.error = action.payload.error;
    },
    replaceFulfilled: (
      state,
      action: PayloadAction<IReplaceTextResourcesFulfilled>,
    ) => {
      state.language = action.payload.language;
      state.resources = action.payload.resources;
    },
    replaceRejected: (
      state,
      action: PayloadAction<IReplaceTextResourcesRejected>,
    ) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  fetch: createAction(`${name}/fetch`),
  replace: createAction(`${name}/replace`),
};

export const TextResourcesActions = {
  ...textResourcesSlice.actions,
  ...actions,
};
export default textResourcesSlice;
