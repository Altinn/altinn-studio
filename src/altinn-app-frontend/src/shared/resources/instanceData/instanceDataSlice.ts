import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IInstanceDataState,
  IGetInstanceData,
  IGetInstanceDataFulfilled,
  IGetInstanceDataRejected,
} from '.';

const initialState: IInstanceDataState = {
  instance: null,
  error: null,
};

const name = 'instanceData';
const instanceDataSlice = createSlice({
  name,
  initialState,
  reducers: {
    getFulfilled: (state, action: PayloadAction<IGetInstanceDataFulfilled>) => {
      state.instance = action.payload.instanceData;
    },
    getRejected: (state, action: PayloadAction<IGetInstanceDataRejected>) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  get: createAction<IGetInstanceData>(`${name}/get`),
};

export const InstanceDataActions = {
  ...instanceDataSlice.actions,
  ...actions,
};
export default instanceDataSlice;
