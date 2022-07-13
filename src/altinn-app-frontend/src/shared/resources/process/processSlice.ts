import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IProcessState,
  IGetProcessStateFulfilled,
  IGetProcessStateRejected,
  ICompleteProcessFulfilled,
  ICompleteProcessRejected,
} from '.';

const initialState: IProcessState = {
  taskType: null,
  error: null,
  taskId: undefined,
};

const name = 'process';
const processSlice = createSlice({
  name,
  initialState,
  reducers: {
    getFulfilled: (state, action: PayloadAction<IGetProcessStateFulfilled>) => {
      state.taskType = action.payload.processStep;
      state.taskId = action.payload.taskId;
      state.error = null;
    },
    getRejected: (state, action: PayloadAction<IGetProcessStateRejected>) => {
      state.error = action.payload.error;
    },
    completeFulfilled: (
      state,
      action: PayloadAction<ICompleteProcessFulfilled>,
    ) => {
      state.taskType = action.payload.processStep;
      state.taskId = action.payload.taskId;
      state.error = null;
    },
    completeRejected: (
      state,
      action: PayloadAction<ICompleteProcessRejected>,
    ) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  get: createAction(`${name}/name`),
  complete: createAction(`${name}/complete`),
  completeFulfilled: createAction<ICompleteProcessFulfilled>(
    `${name}/completeFulfilled`,
  ),
  completeRejected: createAction<ICompleteProcessRejected>(
    `${name}/completeRejected`,
  ),
  checkIfUpdated: createAction(`${name}/checkIfUpdated`),
};

export const ProcessActions = {
  ...processSlice.actions,
  ...actions,
};
export default processSlice;
