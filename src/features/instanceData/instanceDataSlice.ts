import { getInstanceDataSaga } from 'src/features/instanceData/getInstanceDataSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IGetInstanceData,
  IGetInstanceDataFulfilled,
  IGetInstanceDataRejected,
  IInstanceDataState,
} from 'src/features/instanceData/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IInstanceDataState = {
  instance: null,
  error: null,
};

export let InstanceDataActions: ActionsFromSlice<typeof instanceDataSlice>;
export const instanceDataSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IInstanceDataState>) => ({
    name: 'instanceData',
    initialState,
    actions: {
      get: mkAction<IGetInstanceData>({
        takeLatest: getInstanceDataSaga,
      }),
      getFulfilled: mkAction<IGetInstanceDataFulfilled>({
        reducer: (state, action) => {
          state.instance = action.payload.instanceData;
          state.error = null;
        },
      }),
      getRejected: mkAction<IGetInstanceDataRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  InstanceDataActions = slice.actions;
  return slice;
};
