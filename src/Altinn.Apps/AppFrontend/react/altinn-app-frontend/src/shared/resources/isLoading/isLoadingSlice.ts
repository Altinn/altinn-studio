/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';

export interface IIsLoadingState {
  dataTask: boolean;
}

export const initialState: IIsLoadingState = {
  dataTask: null,
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
  },
});

export const {
  startDataTaskIsLoading,
  finishDataTaskIsLoading,
} = isLoadingSlice.actions;

export default isLoadingSlice.reducer;
