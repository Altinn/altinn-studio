import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type {
  IFormRuleState,
  IFetchRuleModelFulfilled,
  IFetchRuleModelRejected,
} from 'src/features/form/rules/index';

const initialState: IFormRuleState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

const name = 'formRules';
const rulesSlice = createSlice({
  name,
  initialState,
  reducers: {
    fetch: (state) => {
      state.fetched = false;
      state.fetching = true;
      state.error = null;
    },
    fetchFulfilled: (
      state,
      action: PayloadAction<IFetchRuleModelFulfilled>,
    ) => {
      state.fetched = true;
      state.fetching = false;
      state.error = null;
      state.model = action.payload.ruleModel;
    },
    fetchRejected: (state, action: PayloadAction<IFetchRuleModelRejected>) => {
      state.fetched = false;
      state.fetching = false;
      state.error = action.payload.error;
    },
  },
});

export const FormRulesActions = rulesSlice.actions;
export default rulesSlice;
