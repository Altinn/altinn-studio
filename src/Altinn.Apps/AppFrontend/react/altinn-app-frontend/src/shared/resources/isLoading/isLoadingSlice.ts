/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';

export interface IIsLoadingState {
  dataTask: boolean;
  stateless: boolean;
}

export const initialState: IIsLoadingState = {
  dataTask: null,
  stateless: null,
};

const moduleName = 'isLoading';

const isLoadingSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    startDataTaskIsLoading: (state: IIsLoadingState) => {
      state.dataTask = true;
    },
    finishDataTaskIsLoading: (state: IIsLoadingState) => {
      state.dataTask = false;
    },
    startStatelessIsLoading: (state: IIsLoadingState) => {
      state.stateless = true;
    },
    finishStatelessIsLoading: (state: IIsLoadingState) => {
      state.stateless = false;
    },
  },
});

export const {
  startDataTaskIsLoading,
  finishDataTaskIsLoading,
  startStatelessIsLoading,
  finishStatelessIsLoading,
} = isLoadingSlice.actions;

export default isLoadingSlice.reducer;
