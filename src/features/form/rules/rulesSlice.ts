import { fetchRuleModelSaga } from 'src/features/form/rules/fetch/fetchRulesSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { IFetchRuleModelFulfilled, IFetchRuleModelRejected, IFormRuleState } from 'src/features/form/rules';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IFormRuleState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

export const formRulesSlice = createSagaSlice((mkAction: MkActionType<IFormRuleState>) => ({
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

export const FormRulesActions = formRulesSlice.actions;
