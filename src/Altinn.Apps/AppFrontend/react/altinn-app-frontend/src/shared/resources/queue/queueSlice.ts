/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
  infoTask: IQueueTask;
  stateless: IQueueTask;
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
  stateless: {
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
    statelessQueueError: (state: IQueueState, action: PayloadAction<IQueueError>) => {
      const { error } = action.payload;
      state.stateless.error = error;
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
    startInitialStatelessQueue: (state: IQueueState) => {
      state.stateless.isDone = false;
    },
    startInitialStatelessQueueFulfilled: (state: IQueueState) => {
      state.stateless.isDone = true;
    },
  },
});

export const {
  appTaskQueueError,
  dataTaskQueueError,
  infoTaskQueueError,
  statelessQueueError,
  startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled,
  startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled,
  startInitialInfoTaskQueue,
  startInitialInfoTaskQueueFulfilled,
  startInitialStatelessQueue,
  startInitialStatelessQueueFulfilled,
} = queueSlice.actions;

export default queueSlice.reducer;
