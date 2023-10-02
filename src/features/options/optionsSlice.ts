import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchOptionsRejectedAction, IOptionsState } from 'src/features/options/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IOptionsState = {
  error: null,
};

export let OptionsActions: ActionsFromSlice<typeof optionsSlice>;
export const optionsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IOptionsState>) => ({
    name: 'optionState',
    initialState,
    actions: {
      fetchRejected: mkAction<IFetchOptionsRejectedAction>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  OptionsActions = slice.actions;
  return slice;
};
