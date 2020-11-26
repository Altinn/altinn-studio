/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';
import { IFetchDataModelFulfilled, IFetchDataModelRejected, ISaveDataModelAction, ISaveDataModelRejected } from './dataModelingActions';

export interface IDataModelingState {
  schema: any;
  filePath: string;
  error: Error;
  saving: boolean;
}

const initialState: IDataModelingState = {
  schema: {},
  filePath: undefined,
  error: null,
  saving: false,
};

const dataModelingSlice = createSlice({
  name: 'dataModeling',
  initialState,
  reducers: {
    fetchDataModel(state, action) {},
    fetchDataModelFulfilled(state, action) {
      const { schema }: IFetchDataModelFulfilled = action.payload;
      state.schema = schema;
      state.error = null;
    },
    fetchDataModelRejected(state, action) {
      const { error }: IFetchDataModelRejected = action.payload;
      state.error = error;
    },
    saveDataModel(state, action) {
      const { schema }: ISaveDataModelAction = action.payload;
      state.schema = schema;
      state.saving = true;
    },
    saveDataModelFulfilled(state, action) {
      state.saving = false;
    },
    saveDataModelRejected(state, action) {
      const { error }: ISaveDataModelRejected = action.payload;
      state.error = error;
      state.saving = false;
    },
    setDataModelFilePath(state, action) {
      const { filePath } = action.payload;
      state.filePath = filePath;
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
} = dataModelingSlice.actions;

export default dataModelingSlice.reducer;
