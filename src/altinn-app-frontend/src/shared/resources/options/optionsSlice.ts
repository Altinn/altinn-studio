import { fetchOptionsSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IFetchingOptionsAction,
  IFetchOptionsFulfilledAction,
  IFetchOptionsRejectedAction,
  IOptionsState,
} from 'src/shared/resources/options';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IOptionsState = {
  options: {},
  error: null,
};

const optionsSlice = createSagaSlice(
  (mkAction: MkActionType<IOptionsState>) => ({
    name: 'optionState',
    initialState,
    actions: {
      fetch: mkAction<void>({
        takeLatest: fetchOptionsSaga,
      }),
      fetchFulfilled: mkAction<IFetchOptionsFulfilledAction>({
        reducer: (state, action) => {
          const { key, options } = action.payload;
          state.options[key].loading = false;
          state.options[key].options = options;
        },
      }),
      fetchRejected: mkAction<IFetchOptionsRejectedAction>({
        reducer: (state, action) => {
          const { key, error } = action.payload;
          state.options[key].loading = false;
          state.error = error;
        },
      }),
      fetching: mkAction<IFetchingOptionsAction>({
        reducer: (state, action) => {
          const { key, metaData } = action.payload;
          state.options[key] = {
            ...(state.options[key] || {}),
            ...metaData,
            loading: true,
          };
        },
      }),
    },
  }),
);

export const OptionsActions = optionsSlice.actions;
export default optionsSlice;
