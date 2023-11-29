import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFormDynamics, IFormDynamicState } from 'src/features/form/dynamics/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IFormDynamicState = {
  ruleConnection: {},
  conditionalRendering: {},
  APIs: undefined,
};

export let FormDynamicsActions: ActionsFromSlice<typeof formDynamicsSlice>;
export const formDynamicsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormDynamicState>) => ({
    name: 'formDynamics',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFormDynamics>({
        reducer: (state, action) => {
          state.APIs = action.payload.APIs;
          state.ruleConnection = action.payload.ruleConnection;
          state.conditionalRendering = action.payload.conditionalRendering;
        },
      }),
    },
  }));

  FormDynamicsActions = slice.actions;
  return slice;
};
