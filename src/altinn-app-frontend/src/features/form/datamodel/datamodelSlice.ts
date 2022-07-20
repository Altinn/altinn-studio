import { watchFetchJsonSchemaSaga } from 'src/features/form/datamodel/fetch/fetchFormDatamodelSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IDataModelState,
  IFetchJsonSchemaFulfilled,
  IFetchJsonSchemaRejected,
} from 'src/features/form/datamodel';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IDataModelState = {
  schemas: {},
  error: null,
};

const formDataModelSlice = createSagaSlice(
  (mkAction: MkActionType<IDataModelState>) => ({
    name: 'formDataModel',
    initialState,
    actions: {
      fetchJsonSchema: mkAction<void>({
        saga: () => watchFetchJsonSchemaSaga,
      }),
      fetchJsonSchemaFulfilled: mkAction<IFetchJsonSchemaFulfilled>({
        reducer: (state, action) => {
          const { schema, id } = action.payload;
          state.schemas[id] = schema;
        },
      }),
      fetchJsonSchemaRejected: mkAction<IFetchJsonSchemaRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
    },
  }),
);

export const DataModelActions = formDataModelSlice.actions;
export default formDataModelSlice;
