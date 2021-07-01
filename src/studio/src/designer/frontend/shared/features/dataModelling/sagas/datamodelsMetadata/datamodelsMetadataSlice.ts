/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IDatamodelsMetadataState {
  datamodelsMetadata: any;
  error: Error;
}

const initialState: IDatamodelsMetadataState = {
  datamodelsMetadata: {},
  error: null,
};

export interface IGetDatamodelsMetadataFulfilled {
  datamodelsMetadata: any;
}

export interface IDatamodelsMetadataActionRejected {
  error: Error;
}

export interface IPutDatamodelsMetadata {
  datamodelsMetadata: any;
}

const moduleName = 'datamodelsMetadata';

const datamodelsMetadataSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    getDatamodelsMetadataFulfilled: (state, action: PayloadAction<IGetDatamodelsMetadataFulfilled>) => {
      const { datamodelsMetadata } = action.payload;
      state.datamodelsMetadata = datamodelsMetadata;
    },
    getDatamodelsMetadataRejected: (state, action: PayloadAction<IDatamodelsMetadataActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  getDatamodelsMetadata: createAction(`${moduleName}/getDatamodelsMetadata`),
};

export const DatamodelsMetadataActions = {
  ...actions,
  ...datamodelsMetadataSlice.actions,
};

export default datamodelsMetadataSlice.reducer;
