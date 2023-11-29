import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchRuleModelFulfilled, IFormRuleState } from 'src/features/form/rules/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IFormRuleState = {
  model: [],
};

export let FormRulesActions: ActionsFromSlice<typeof formRulesSlice>;
export const formRulesSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormRuleState>) => ({
    name: 'formRules',
    initialState,
    actions: {
      fetchFulfilled: mkAction<IFetchRuleModelFulfilled>({
        reducer: (state, action) => {
          state.model = action.payload.ruleModel;
        },
      }),
    },
  }));

  FormRulesActions = slice.actions;
  return slice;
};
