import type { PayloadAction } from '@reduxjs/toolkit';
import { createAction, createSlice } from '@reduxjs/toolkit';

export interface IRepoStatusState {
  branch: IBranch;
  resettingLocalRepo: boolean;
  error: Error;
}

export interface IBranch {
  master: any;
}

const initialState: IRepoStatusState = {
  branch: {
    master: null,
  },
  resettingLocalRepo: false,
  error: null,
};

export interface IRepoStatusAction {
  org: string;
  repo: string;
}
export interface IRepoStatusActionFulfilled {
  result: any;
}
export interface IRepoStatusActionRejected {
  error: Error;
}

const moduleName = 'repoStatus';
export const repoStatusSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    getMasterRepoStatusFulfilled: (state, action: PayloadAction<IRepoStatusActionFulfilled>) => {
      const { result } = action.payload;
      state.branch.master = result;
      state.error = null;
    },
    getMasterRepoStatusRejected: (state, action: PayloadAction<IRepoStatusActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  getMasterRepoStatus: createAction<IRepoStatusAction>(`${moduleName}/getMasterRepoStatus`),
};

export const RepoStatusActions = {
  ...actions,
  ...repoStatusSlice.actions,
};

export default repoStatusSlice.reducer;
