/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
import { ISchema } from '@altinn/schema-editor/types';
import { Action, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IDataModelAction {
  payload: IDataModelActionPayload;
  type: string;
}
export interface IDataModelActionPayload {
  schema: ISchema;
}

export interface IDataModelErrorActionPayload extends Action {
  error: Error;
}

export interface ISetDataModelFilePathActionPayload extends Action {
  filePath: string;
}
export interface IDataModelingState {
  schema: ISchema;
  modelName: string;
  error: Error;
  saving: boolean;
}

export interface IDeleteDataModelRejected {
  error: any;
}

const initialState: IDataModelingState = {
  schema: { properties: {}, definitions: {} },
  modelName: undefined,
  error: null,
  saving: false,
};

const dataModelingSlice = createSlice({
  name: 'dataModeling',
  initialState,
  reducers: {
    fetchDataModel(state, action) {},
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
      state.schema = schema;
      state.saving = true;
    },
    saveDataModelFulfilled(state, action) {
      state.saving = false;
    },
    saveDataModelRejected(state, action) {
      const { error } = action.payload;
      state.error = error;
      state.saving = false;
    },
    setDataModelName(state, action) {
      const { modelName } = action.payload;
      state.modelName = modelName;
    },
    createNewDataModel(state, action) {
      const { modelName } = action.payload;
      state.modelName = modelName;
      state.error = null;
      state.schema = { properties: {}, definitions: {} };
    },
    deleteDataModel(state) {
      state.saving = true;
    },
    deleteDataModelFulfilled(state) {
      state.saving = false;
      state.schema = { properties: {}, definitions: {} };
      state.modelName = '';
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
  setDataModelName,
  createNewDataModel,
  deleteDataModel,
  deleteDataModelFulfilled,
  deleteDataModelRejected,
} = dataModelingSlice.actions;

export default dataModelingSlice.reducer;
