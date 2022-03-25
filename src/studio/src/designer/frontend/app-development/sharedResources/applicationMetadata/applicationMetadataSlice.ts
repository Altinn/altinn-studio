import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IApplicationMetadataState {
  applicationMetadata: any;
  error: Error;
}

const initialState: IApplicationMetadataState = {
  applicationMetadata: {},
  error: null,
};

export interface IGetApplicationMetadataFulfilled {
  applicationMetadata: any;
}

export interface IApplicationMetadataActionRejected {
  error: Error;
}

export interface IPutApplicationMetadata {
  applicationMetadata: any;
}

const moduleName = 'applicationMetadata';

const applicationMetadataSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    getApplicationMetadataFulfilled: (
      state,
      action: PayloadAction<IGetApplicationMetadataFulfilled>,
    ) => {
      const { applicationMetadata } = action.payload;
      state.applicationMetadata = applicationMetadata;
    },
    getApplicationMetadataRejected: (
      state,
      action: PayloadAction<IApplicationMetadataActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    putApplicationMetadataFulfilled: (
      state,
      action: PayloadAction<IPutApplicationMetadata>,
    ) => {
      const { applicationMetadata } = action.payload;
      state.applicationMetadata = applicationMetadata;
    },
    putApplicationMetadataRejected: (
      state,
      action: PayloadAction<IApplicationMetadataActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  getApplicationMetadata: createAction(`${moduleName}/getApplicationMetadata`),
  putApplicationMetadata: createAction<IPutApplicationMetadata>(
    `${moduleName}/putApplicationMetadata`,
  ),
};

export const ApplicationMetadataActions = {
  ...actions,
  ...applicationMetadataSlice.actions,
};

export default applicationMetadataSlice.reducer;
