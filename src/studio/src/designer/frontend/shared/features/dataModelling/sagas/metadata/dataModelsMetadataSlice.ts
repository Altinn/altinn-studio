/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IDataModelMetadataItem { repositoryRelativeUrl: string, fileName: string, select?: boolean }
export interface IDataModelsMetadataState {
  dataModelsMetadata: IDataModelMetadataItem[];
  error?: Error;
}
const initialState: IDataModelsMetadataState = {
  dataModelsMetadata: [],
  error: null,
};

export interface IDataModelsMetadataAction {
  schemaName?: string;
}

export interface IGetDataModelsMetadataFulfilled {
  dataModelsMetadata: any;
}

export interface IDataModelsMetadataActionRejected {
  error: Error;
}
const moduleName = 'dataModelsMetadata';

const dataModelsMetadataSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    getDataModelsMetadataFulfilled: (state, action: PayloadAction<IGetDataModelsMetadataFulfilled>) => {
      const { dataModelsMetadata } = action.payload;
      state.dataModelsMetadata = dataModelsMetadata;
    },
    getDataModelsMetadataRejected: (state, action: PayloadAction<IDataModelsMetadataActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  getDataModelsMetadata: createAction<IDataModelsMetadataAction>(`${moduleName}/getDataModelsMetadata`),
};

export const DataModelsMetadataActions = {
  ...actions,
  ...dataModelsMetadataSlice.actions,
};

export default dataModelsMetadataSlice.reducer;
