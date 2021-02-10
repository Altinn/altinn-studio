import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

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

export interface IFetchRepoStatusFulfilled {
  result: any;
}

export interface IFetchRepoStatusRejected {
  error: Error;
}

const moduleName = 'handleMergeConflict';
const handleMergeConflictSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchRepoStatusFulfilled: (state, action: PayloadAction<IFetchRepoStatusFulfilled>) => {
      const { result } = action.payload;
      // eslint-disable-next-line no-param-reassign
      state.repoStatus = result;
    },
  },
});

export const fetchRepoStatus = createAction<IFetchRepoStatusAction>(`${moduleName}/fetchRepoStatus`);
export const fetchRepoStatusRejected = createAction<IFetchRepoStatusRejected>(`${moduleName}/fetchRepoStatusRejected`);

export const {
  fetchRepoStatusFulfilled,
} = handleMergeConflictSlice.actions;

export default handleMergeConflictSlice.reducer;
