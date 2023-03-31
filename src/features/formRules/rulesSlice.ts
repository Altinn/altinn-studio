import { fetchRuleModelSaga } from 'src/features/formRules/fetchRulesSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchRuleModelFulfilled, IFetchRuleModelRejected, IFormRuleState } from 'src/features/formRules/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IFormRuleState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

export let FormRulesActions: ActionsFromSlice<typeof formRulesSlice>;
export const formRulesSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormRuleState>) => ({
    name: 'formRules',
    initialState,
    actions: {
      fetch: mkAction<void>({
        takeLatest: fetchRuleModelSaga,
        reducer: (state) => {
          state.fetched = false;
          state.fetching = true;
          state.error = null;
        },
      }),
      fetchFulfilled: mkAction<IFetchRuleModelFulfilled>({
        reducer: (state, action) => {
          state.fetched = true;
          state.fetching = false;
          state.error = null;
          state.model = action.payload.ruleModel;
        },
      }),
      fetchRejected: mkAction<IFetchRuleModelRejected>({
        reducer: (state, action) => {
          state.fetched = false;
          state.fetching = false;
          state.error = action.payload.error;
        },
      }),
    },
  }));

  FormRulesActions = slice.actions;
  return slice;
};
