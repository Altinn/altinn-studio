import { fetchOptionsSaga, watchFinishedLoadingSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IFetchingOptionsAction,
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
  loading: true,
};

export const optionsSlice = createSagaSlice((mkAction: MkActionType<IOptionsState>) => ({
  name: 'optionState',
  initialState,
  extraSagas: [watchFinishedLoadingSaga],
  actions: {
    fetch: mkAction<void>({
      takeEvery: fetchOptionsSaga,
    }),
    loaded: mkAction<void>({
      reducer: (state) => {
        state.loading = false;
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
