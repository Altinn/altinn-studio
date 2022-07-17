import type {
  IInstantiationState,
  IInstantiateFulfilled,
  IInstantiateRejected,
} from '.';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import { instantiationSaga } from 'src/features/instantiate/instantiation/sagas/instantiate';

const initialState: IInstantiationState = {
  instantiating: false,
  instanceId: null,
  error: null,
};

const instantiationSlice = createSagaSlice(
  (mkAction: MkActionType<IInstantiationState>) => ({
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
        reducer: (state, action) => {
          state.instanceId = action.payload.instanceId;
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
  }),
);

export const InstantiationActions = instantiationSlice.actions;
export default instantiationSlice;
