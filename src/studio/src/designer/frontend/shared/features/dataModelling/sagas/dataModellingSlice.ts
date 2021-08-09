/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
import { Action, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ISchema } from '@altinn/schema-editor/types';
import { IDataModelsMetadataState } from './metadata';

export interface IDataModelAction {
  payload: IDataModelActionPayload;
  type: string;
}
export interface IDataModelActionPayload {
  schema: ISchema;
  repoType?: string;
  metadata?: any;
}

export interface IDataModelErrorActionPayload extends Action {
  error: Error;
}

export interface ISetDataModelFilePathActionPayload extends Action {
  filePath: string;
}
export interface IDataModellingState {
  schema: ISchema;
  error: Error;
  saving: boolean;
  metadata?: IDataModelsMetadataState;
}

export interface IDeleteDataModelRejected {
  error: any;
}

const newSchema: ISchema = {
  properties: {
    melding: {
      type: 'object',
    },
  },
  definitions: {},
};

const initialState: IDataModellingState = {
  schema: newSchema,
  error: null,
  saving: false,
};

const dataModellingSlice = createSlice({
  name: 'dataModelling',
  initialState,
  reducers: {
    fetchDataModel(state, _) {
      state.schema = null;
    },
    fetchDataModelFulfilled(state, action) {
      const { schema } = action.payload;
      state.schema = schema;
      state.error = null;
    },
    fetchDataModelRejected(state, action) {
      const { error } = action.payload;
      state.error = error;
    },
    saveDataModel(state, action) {
      const { schema } = action.payload;
      state.saving = true;
      state.schema = schema;
    },
    saveDataModelFulfilled(state) {
      state.saving = false;
    },
    saveDataModelRejected(state, action) {
      const { error } = action.payload;
      state.saving = false;
      state.error = error;
    },
    createNewDataModel(state, { payload }) {
      state.error = null;
      state.schema = newSchema;
    },
    deleteDataModel(state, _) {
      state.saving = true;
    },
    deleteDataModelFulfilled(state) {
      state.saving = false;
    },
    deleteDataModelRejected(state, action: PayloadAction<IDeleteDataModelRejected>) {
      state.error = action.payload.error;
      state.saving = false;
    },
  },
});

export const {
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
  saveDataModel,
  saveDataModelFulfilled,
  saveDataModelRejected,
  createNewDataModel,
  deleteDataModel,
  deleteDataModelFulfilled,
  deleteDataModelRejected,
} = dataModellingSlice.actions;

export default dataModellingSlice.reducer;
