import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IOptionsState,
  IFetchOptionsFulfilledAction,
  IFetchOptionsRejectedAction,
  IFetchingOptionsAction,
} from '.';

const initialState: IOptionsState = {
  options: {},
  error: null,
};

const name = 'optionState';
const optionsSlice = createSlice({
  name,
  initialState,
  reducers: {
    fetchFulfilled: (
      state,
      action: PayloadAction<IFetchOptionsFulfilledAction>,
    ) => {
      const { key, options } = action.payload;
      state.options[key].loading = false;
      state.options[key].options = options;
    },
    fetchRejected: (
      state,
      action: PayloadAction<IFetchOptionsRejectedAction>,
    ) => {
      const { key, error } = action.payload;
      state.options[key].loading = false;
      state.error = error;
    },
    fetching: (state, action: PayloadAction<IFetchingOptionsAction>) => {
      const { key, metaData } = action.payload;
      state.options[key] = {
        ...(state.options[key] || {}),
        ...metaData,
        loading: true,
      };
    },
  },
});

const actions = {
  fetch: createAction(`${name}/fetch`),
};

export const OptionsActions = {
  ...optionsSlice.actions,
  ...actions,
};
export default optionsSlice;
