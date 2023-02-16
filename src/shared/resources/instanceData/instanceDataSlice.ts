import { getInstanceDataSaga } from 'src/shared/resources/instanceData/get/getInstanceDataSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IGetInstanceData,
  IGetInstanceDataFulfilled,
  IGetInstanceDataRejected,
  IInstanceDataState,
} from 'src/shared/resources/instanceData';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IInstanceDataState = {
  instance: null,
  error: null,
};

export const instanceDataSlice = createSagaSlice((mkAction: MkActionType<IInstanceDataState>) => ({
  name: 'instanceData',
  initialState,
  actions: {
    get: mkAction<IGetInstanceData>({
      takeLatest: getInstanceDataSaga,
    }),
    getFulfilled: mkAction<IGetInstanceDataFulfilled>({
      reducer: (state, action) => {
        state.instance = action.payload.instanceData;
      },
    }),
    getRejected: mkAction<IGetInstanceDataRejected>({
      reducer: (state, action) => {
        state.error = action.payload.error;
      },
    }),
  },
}));

export const InstanceDataActions = instanceDataSlice.actions;
