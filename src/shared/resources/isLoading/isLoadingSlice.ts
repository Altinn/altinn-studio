import { watcherFinishDataTaskIsloadingSaga } from 'src/shared/resources/isLoading/dataTask/dataTaskIsLoadingSagas';
import { watcherFinishStatelessIsLoadingSaga } from 'src/shared/resources/isLoading/stateless/statelessIsLoadingSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

export interface IIsLoadingState {
  dataTask: boolean | null;
  stateless: boolean | null;
}

export const initialState: IIsLoadingState = {
  dataTask: null,
  stateless: null,
};

export const isLoadingSlice = createSagaSlice((mkAction: MkActionType<IIsLoadingState>) => ({
  name: 'isLoading',
  initialState,
  actions: {
    startDataTaskIsLoading: mkAction<void>({
      reducer: (state) => {
        state.dataTask = true;
      },
    }),
    finishDataTaskIsLoading: mkAction<void>({
      saga: () => watcherFinishDataTaskIsloadingSaga,
      reducer: (state) => {
        state.dataTask = false;
      },
    }),
    startStatelessIsLoading: mkAction<void>({
      reducer: (state) => {
        state.stateless = true;
      },
    }),
    finishStatelessIsLoading: mkAction<void>({
      saga: () => watcherFinishStatelessIsLoadingSaga,
      reducer: (state) => {
        state.stateless = false;
      },
    }),
  },
}));

export const IsLoadingActions = isLoadingSlice.actions;
