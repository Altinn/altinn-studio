/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
  infoTask: IQueueTask;
}

export interface IQueueTask {
  isDone: boolean;
  error: any;
}

export interface IQueueError {
  error: any;
}

export const initialState: IQueueState = {
  dataTask: {
    isDone: null,
    error: null,
  },
  appTask: {
    isDone: null,
    error: null,
  },
  infoTask: {
    isDone: null,
    error: null,
  },
};

const moduleName = 'queue';

const queueSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    appTaskQueueError: (state: IQueueState, action: PayloadAction<IQueueError>) => {
      const { error } = action.payload;
      state.appTask.error = error;
    },
    dataTaskQueueError: (state: IQueueState, action: PayloadAction<IQueueError>) => {
      const { error } = action.payload;
      state.dataTask.error = error;
    },
    infoTaskQueueError: (state: IQueueState, action: PayloadAction<IQueueError>) => {
      const { error } = action.payload;
      state.infoTask.error = error;
    },
    startInitialAppTaskQueue: (state: IQueueState) => {
      state.appTask.isDone = false;
    },
    startInitialAppTaskQueueFulfilled: (state: IQueueState) => {
      state.appTask.isDone = true;
    },
    startInitialDataTaskQueue: (state: IQueueState) => {
      state.dataTask.isDone = false;
    },
    startInitialDataTaskQueueFulfilled: (state: IQueueState) => {
      state.dataTask.isDone = true;
    },
    startInitialInfoTaskQueue: (state: IQueueState) => {
      state.infoTask.isDone = false;
    },
    startInitialInfoTaskQueueFulfilled: (state: IQueueState) => {
      state.infoTask.isDone = true;
    },
  },
});

export const {
  appTaskQueueError,
  dataTaskQueueError,
  infoTaskQueueError,
  startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled,
  startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled,
  startInitialInfoTaskQueue,
  startInitialInfoTaskQueueFulfilled,
} = queueSlice.actions;

export default queueSlice.reducer;
