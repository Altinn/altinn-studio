import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchRuleModelFulfilled, IFetchRuleModelRejected, IFormRuleState } from 'src/features/formRules/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IFormRuleState = {
  model: [],
  error: null,
};

export let FormRulesActions: ActionsFromSlice<typeof formRulesSlice>;
export const formRulesSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormRuleState>) => ({
    name: 'formRules',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFetchRuleModelFulfilled>({
        reducer: (state, action) => {
          state.error = null;
          state.model = action.payload.ruleModel;
        },
      }),
      fetchRejected: mkAction<IFetchRuleModelRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  FormRulesActions = slice.actions;
  return slice;
};
