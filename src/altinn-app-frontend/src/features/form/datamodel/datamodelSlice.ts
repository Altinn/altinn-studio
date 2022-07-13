import type { PayloadAction } from '@reduxjs/toolkit';
import { createAction, createSlice } from '@reduxjs/toolkit';
import type {
  IDataModelState,
  IFetchJsonSchemaFulfilled,
  IFetchJsonSchemaRejected,
} from 'src/features/form/datamodel/index';

const initialState: IDataModelState = {
  schemas: {},
  error: null,
};

const moduleName = 'formDataModel';
const formDataModelSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchJsonSchemaFulfilled: (
      state,
      action: PayloadAction<IFetchJsonSchemaFulfilled>,
    ) => {
      const { schema, id } = action.payload;
      state.schemas[id] = schema;
    },
    fetchJsonSchemaRejected: (
      state,
      action: PayloadAction<IFetchJsonSchemaRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  fetchJsonSchema: createAction(`${moduleName}/fetchJsonSchema`),
};

export const DataModelActions = {
  ...formDataModelSlice.actions,
  ...actions,
};

export default formDataModelSlice;
