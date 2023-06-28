import { fetchDynamicsSaga } from 'src/features/dynamics/fetchFormDynamicsSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IFetchServiceConfigFulfilled,
  IFetchServiceConfigRejected,
  IFormDynamicState,
} from 'src/features/dynamics/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IFormDynamicState = {
  ruleConnection: {},
  conditionalRendering: {},
  apis: undefined,
  error: null,
};

export let FormDynamicsActions: ActionsFromSlice<typeof formDynamicsSlice>;
export const formDynamicsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormDynamicState>) => ({
    name: 'formDynamics',
    initialState,
    actions: {
      fetch: mkAction<IFetchServiceConfigFulfilled | undefined>({
        takeLatest: fetchDynamicsSaga,
      }),
      fetchFulfilled: mkAction<IFetchServiceConfigFulfilled>({
        reducer: (state, action) => {
          state.apis = action.payload.apis;
          state.ruleConnection = action.payload.ruleConnection;
          state.conditionalRendering = action.payload.conditionalRendering;
          state.error = null;
        },
      }),
      fetchRejected: mkAction<IFetchServiceConfigRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  FormDynamicsActions = slice.actions;
  return slice;
};
