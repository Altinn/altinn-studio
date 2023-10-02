import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IDataListsState, IFetchDataListsRejectedAction } from 'src/features/dataLists/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IDataListsState = {
  error: null,
};

export let DataListsActions: ActionsFromSlice<typeof dataListsSlice>;
export const dataListsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IDataListsState>) => ({
    name: 'dataListState',
    initialState,
    actions: {
      fetchRejected: mkAction<IFetchDataListsRejectedAction>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
    },
  }));

  DataListsActions = slice.actions;
  return slice;
};
