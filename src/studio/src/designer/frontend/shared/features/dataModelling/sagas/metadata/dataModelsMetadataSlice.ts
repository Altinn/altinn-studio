/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IDataModelMetadataItem {
  repositoryRelativeUrl: string;
  fileName: string;
  select?: boolean;
}
export interface IDataModelsMetadataState {
  dataModelsMetadata?: IDataModelMetadataItem[];
  error?: Error;
  loadState: LoadingState;
}

export enum LoadingState {
  Idle = 'Idle',
  LoadingModels = 'LoadingModels',
  ModelsLoaded = 'ModelsLoaded',
  Error = 'Error',
}

const initialState: IDataModelsMetadataState = {
  dataModelsMetadata: [],
  error: null,
  loadState: LoadingState.Idle,
};

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
    getDataModelsMetadata: (state) => {
      state.loadState = LoadingState.LoadingModels;
    },
    getDataModelsMetadataFulfilled: (state, action: PayloadAction<IGetDataModelsMetadataFulfilled>) => {
      const { dataModelsMetadata } = action.payload;
      state.dataModelsMetadata = dataModelsMetadata;
      state.loadState = LoadingState.ModelsLoaded;
    },
    getDataModelsMetadataRejected: (state, action: PayloadAction<IDataModelsMetadataActionRejected>) => {
      const { error } = action.payload;
      state.loadState = LoadingState.Error;
      state.error = error;
    },
  },
});

const actions = {
  getDataModelsMetadata: createAction(`${moduleName}/getDataModelsMetadata`),
};

export const DataModelsMetadataActions = {
  ...actions,
  ...dataModelsMetadataSlice.actions,
};

export default dataModelsMetadataSlice.reducer;
