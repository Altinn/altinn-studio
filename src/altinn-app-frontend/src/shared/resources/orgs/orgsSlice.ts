import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type { IOrgsState, IFetchOrgsFulfilled, IFetchOrgsRejected } from '.';

const initialState: IOrgsState = {
  allOrgs: null,
  error: null,
};

const name = 'organisationMetaData';
const orgsSlice = createSlice({
  name,
  initialState,
  reducers: {
    fetchFulfilled: (state, action: PayloadAction<IFetchOrgsFulfilled>) => {
      state.allOrgs = action.payload.orgs;
    },
    fetchRejected: (state, action: PayloadAction<IFetchOrgsRejected>) => {
      state.error = action.payload.error;
    },
  },
});

const actions = {
  fetch: createAction(`${name}/fetch`),
};

export const OrgsActions = {
  ...orgsSlice.actions,
  ...actions,
};
export default orgsSlice;
