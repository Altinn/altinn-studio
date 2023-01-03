import { fetchOptionsSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IFetchingOptionsAction,
  IFetchOptionsCountFulfilledAction,
  IFetchOptionsFulfilledAction,
  IFetchOptionsRejectedAction,
  IOptionsState,
  ISetOptions,
  ISetOptionsWithIndexIndicators,
} from 'src/shared/resources/options';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IOptionsState = {
  options: {},
  optionsWithIndexIndicators: [],
  error: null,
  optionsCount: 0,
  optionsLoadedCount: 0,
  loading: true,
};

const optionsSlice = createSagaSlice((mkAction: MkActionType<IOptionsState>) => ({
  name: 'optionState',
  initialState,
  actions: {
    fetch: mkAction<void>({
      takeEvery: fetchOptionsSaga,
    }),
    optionCountFulfilled: mkAction<IFetchOptionsCountFulfilledAction>({
      reducer: (state, action) => {
        const { count } = action.payload;
        if (count <= 0) {
          state.loading = false;
        } else {
          state.optionsCount = count;
        }
      },
    }),
    fetchFulfilled: mkAction<IFetchOptionsFulfilledAction>({
      reducer: (state, action) => {
        const { key, options } = action.payload;
        const option = state.options[key];
        if (option) {
          option.loading = false;
          option.options = options;
        }
        if (state.loading) {
          state.optionsLoadedCount++;
          if (state.optionsLoadedCount == state.optionsCount) {
            state.loading = false;
          }
        }
      },
    }),
    fetchRejected: mkAction<IFetchOptionsRejectedAction>({
      reducer: (state, action) => {
        const { key, error } = action.payload;
        const option = state.options[key];
        if (option) {
          option.loading = false;
        }
        state.error = error;
        if (state.loading) {
          state.optionsLoadedCount++;
          if (state.optionsLoadedCount == state.optionsCount) {
            state.loading = false;
          }
        }
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
    setOptionsWithIndexIndicators: mkAction<ISetOptionsWithIndexIndicators>({
      reducer: (state, action) => {
        const { optionsWithIndexIndicators } = action.payload;
        state.optionsWithIndexIndicators = optionsWithIndexIndicators;
      },
    }),
    setOptions: mkAction<ISetOptions>({
      reducer: (state, action) => {
        const { options } = action.payload;
        state.options = options;
      },
    }),
  },
}));

export const OptionsActions = optionsSlice.actions;
export default optionsSlice;
