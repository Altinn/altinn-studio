import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IDataModelState,
  IFetchJsonSchemaFulfilled,
  IFetchJsonSchemaRejected,
} from 'src/features/datamodel/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IDataModelState = {
  schemas: {},
  error: null,
};

export let DataModelActions: ActionsFromSlice<typeof formDataModelSlice>;
export const formDataModelSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IDataModelState>) => ({
    name: 'formDataModel',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFetchJsonSchemaFulfilled>({
        reducer: (state, action) => {
          const { schema, id } = action.payload;
          state.schemas[id] = schema;
        },
      }),
      fetchRejected: mkAction<IFetchJsonSchemaRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
    },
  }));

  DataModelActions = slice.actions;
  return slice;
};
