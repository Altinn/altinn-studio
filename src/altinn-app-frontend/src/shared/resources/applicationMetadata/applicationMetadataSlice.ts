import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IApplicationMetadataState,
  IGetApplicationMetadataFulfilled,
  IGetApplicationMetadataRejected,
} from 'src/shared/resources/applicationMetadata/index';

const initialState: IApplicationMetadataState = {
  applicationMetadata: null,
  error: null,
};

const name = 'applicationMetadata';
const applicationMetadataSlice = createSlice({
  name,
  initialState,
  reducers: {
    getFulfilled: (
      state,
      action: PayloadAction<IGetApplicationMetadataFulfilled>,
    ) => {
      state.applicationMetadata = action.payload.applicationMetadata;
      state.error = null;
    },
    getRejected: (
      state,
      action: PayloadAction<IGetApplicationMetadataRejected>,
    ) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  get: createAction(`${name}/get`),
};

export const ApplicationMetadataActions = {
  ...applicationMetadataSlice.actions,
  ...actions,
};
export default applicationMetadataSlice;
