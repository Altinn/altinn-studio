import { instantiationSaga } from 'src/features/instantiate/instantiation/instantiationSaga';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IInstantiateFulfilled,
  IInstantiateRejected,
  IInstantiationState,
} from 'src/features/instantiate/instantiation';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IInstantiationState = {
  instantiating: false,
  instanceId: null,
  error: null,
};

export let InstantiationActions: ActionsFromSlice<typeof instantiationSlice>;
export const instantiationSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IInstantiationState>) => ({
    name: 'instantiation',
    initialState,
    actions: {
      instantiate: mkAction<void>({
        takeLatest: instantiationSaga,
        reducer: (state) => {
          state.instantiating = true;
        },
      }),
      instantiateFulfilled: mkAction<IInstantiateFulfilled>({
        reducer: (state, { payload }) => {
          state.instanceId = payload.instanceId;
          state.instantiating = false;
        },
      }),
      instantiateRejected: mkAction<IInstantiateRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
          state.instantiating = false;
        },
      }),
    },
  }));
  InstantiationActions = slice.actions;
  return slice;
};
