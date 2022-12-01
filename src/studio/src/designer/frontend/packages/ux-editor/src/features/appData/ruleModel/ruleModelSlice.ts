import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { IFormDesignerActionRejected, IRuleModelFieldElement } from '../../../types/global';

export interface IRuleModelState {
  model: IRuleModelFieldElement[];
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: IRuleModelState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

export interface IFetchRuleModelFulfilled {
  ruleModel: IRuleModelFieldElement[];
}

const ruleModelSlice = createSlice({
  name: 'ruleModel',
  initialState,
  reducers: {
    fetchRuleModel: (state) => {
      state.fetched = false;
      state.fetching = true;
      state.error = null;
    },
    fetchRuleModelFulfilled: (state, action: PayloadAction<IFetchRuleModelFulfilled>) => {
      const { ruleModel } = action.payload;
      state.model = ruleModel;
      state.fetched = true;
      state.fetching = false;
      state.error = null;
    },
    fetchRuleModelRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.fetched = false;
      state.fetching = false;
    },
  },
});

export const { fetchRuleModel, fetchRuleModelFulfilled, fetchRuleModelRejected } =
  ruleModelSlice.actions;

export default ruleModelSlice.reducer;
