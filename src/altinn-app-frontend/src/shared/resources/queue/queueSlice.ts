import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface IQueueState {
  dataTask: IQueueTask;
  appTask: IQueueTask;
  userTask: IQueueTask;
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

const commonState = { isDone: null, error: null };
export const initialState: IQueueState = {
  dataTask: { ...commonState },
  appTask: { ...commonState },
  userTask: { ...commonState },
  infoTask: { ...commonState },
  stateless: { ...commonState },
};

const moduleName = 'queue';

const queueSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    appTaskQueueError: (
      state: IQueueState,
      action: PayloadAction<IQueueError>,
    ) => {
      const { error } = action.payload;
      state.appTask.error = error;
    },
    userTaskQueueError: (
      state: IQueueState,
      action: PayloadAction<IQueueError>,
    ) => {
      const { error } = action.payload;
      state.userTask.error = error;
    },
    dataTaskQueueError: (
      state: IQueueState,
      action: PayloadAction<IQueueError>,
    ) => {
      const { error } = action.payload;
      state.dataTask.error = error;
    },
    infoTaskQueueError: (
      state: IQueueState,
      action: PayloadAction<IQueueError>,
    ) => {
      const { error } = action.payload;
      state.infoTask.error = error;
    },
    statelessQueueError: (
      state: IQueueState,
      action: PayloadAction<IQueueError>,
    ) => {
      const { error } = action.payload;
      state.stateless.error = error;
    },
    startInitialAppTaskQueue: (state: IQueueState) => {
      state.appTask.isDone = false;
    },
    startInitialAppTaskQueueFulfilled: (state: IQueueState) => {
      state.appTask.isDone = true;
    },
    startInitialUserTaskQueue: (state: IQueueState) => {
      state.userTask.isDone = false;
    },
    startInitialUserTaskQueueFulfilled: (state: IQueueState) => {
      state.userTask.isDone = true;
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
  userTaskQueueError,
  dataTaskQueueError,
  infoTaskQueueError,
  statelessQueueError,
  startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled,
  startInitialUserTaskQueue,
  startInitialUserTaskQueueFulfilled,
  startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled,
  startInitialInfoTaskQueue,
  startInitialInfoTaskQueueFulfilled,
  startInitialStatelessQueue,
  startInitialStatelessQueueFulfilled,
} = queueSlice.actions;

export default queueSlice;
