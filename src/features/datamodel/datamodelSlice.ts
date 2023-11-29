import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IDataModelState, IFetchJsonSchemaFulfilled } from 'src/features/datamodel/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IDataModelState = {
  schemas: {},
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
    },
  }));

  DataModelActions = slice.actions;
  return slice;
};
