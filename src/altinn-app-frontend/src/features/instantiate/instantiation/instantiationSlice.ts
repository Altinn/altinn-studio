import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type {
  IInstantiationState,
  IInstantiateFulfilled,
  IInstantiateRejected,
} from '.';

const initialState: IInstantiationState = {
  instantiating: false,
  instanceId: null,
  error: null,
};

const name = 'instantiation';
const instantiationSlice = createSlice({
  name,
  initialState,
  reducers: {
    instantiate: (state) => {
      state.instantiating = true;
    },
    instantiateFulfilled: (
      state,
      action: PayloadAction<IInstantiateFulfilled>,
    ) => {
      state.instanceId = action.payload.instanceId;
      state.instantiating = false;
    },
    instantiateRejected: (
      state,
      action: PayloadAction<IInstantiateRejected>,
    ) => {
      state.error = action.payload.error;
      state.instantiating = false;
    },
  },
});

export const InstantiationActions = instantiationSlice.actions;
export default instantiationSlice;
