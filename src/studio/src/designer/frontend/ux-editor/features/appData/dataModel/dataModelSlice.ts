/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IDataModelState {
  model: IDataModelFieldElement[];
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: IDataModelState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

export interface IFetchDataModelFulfilled {
  dataModel: IDataModelFieldElement[];
}

const dataModelSlice = createSlice({
  name: 'dataModel',
  initialState,
  reducers: {
    fetchDataModel: (state) => {
      state.fetched = false;
      state.fetching = true;
      state.error = null;
    },
    fetchDataModelFulfilled: (state, action: PayloadAction<IFetchDataModelFulfilled>) => {
      const { dataModel } = action.payload;
      state.model = dataModel;
      state.fetched = true;
      state.fetching = false;
      state.error = null;
    },
    fetchDataModelRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.fetched = false;
      state.fetching = false;
    },
  },
});

export const {
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
} = dataModelSlice.actions;

export default dataModelSlice.reducer;
