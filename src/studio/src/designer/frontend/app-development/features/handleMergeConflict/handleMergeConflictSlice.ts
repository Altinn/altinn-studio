import type { PayloadAction } from '@reduxjs/toolkit';
import { createAction, createSlice } from '@reduxjs/toolkit';

export interface IHandleMergeConflictState {
  repoStatus: any;
}

const initialState: IHandleMergeConflictState = {
  repoStatus: {
    hasMergeConflict: null,
  },
};

export interface IFetchRepoStatusAction {
  url: string;
  org: string;
  repo: string;
}

interface IFetchRepoStatusFulfilled {
  result: any;
}

interface IFetchRepoStatusRejected {
  error: Error;
}

const moduleName = 'handleMergeConflict';
const handleMergeConflictSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchRepoStatusFulfilled: (state, action: PayloadAction<IFetchRepoStatusFulfilled>) => {
      const { result } = action.payload;
      state.repoStatus = result;
    },
  },
});

export const fetchRepoStatus = createAction<IFetchRepoStatusAction>(
  `${moduleName}/fetchRepoStatus`
);
export const fetchRepoStatusRejected = createAction<IFetchRepoStatusRejected>(
  `${moduleName}/fetchRepoStatusRejected`
);

export const { fetchRepoStatusFulfilled } = handleMergeConflictSlice.actions;

export default handleMergeConflictSlice.reducer;
