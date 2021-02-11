/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IConfigurationState {
  environments: IEnvironmentsConfigurationState;
  orgs: IOrgsState;
}

interface IEnvironmentsConfigurationState {
  result: any;
  error: Error;
}

interface IOrgsState {
  allOrgs: any;
  error: Error;
}

const initialState: IConfigurationState = {
  environments: {
    result: null,
    error: null,
  },
  orgs: {
    allOrgs: null,
    error: null,
  },
};

export interface IGetEnvironmentsFulfilled {
  result: any;
}

export interface IConfigurationActionRejected {
  error: Error;
}

export interface IGetOrgsFulfilled {
  orgs: any;
}

const moduleName = 'configuration';

const configurationSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    getEnvironmentsFulfilled: (state, action: PayloadAction<IGetEnvironmentsFulfilled>) => {
      const { result } = action.payload;
      state.environments.result = result.environments;
      state.environments.error = null;
    },
    getEnvironmentsRejected: (state, action: PayloadAction<IConfigurationActionRejected>) => {
      const { error } = action.payload;
      state.environments.error = error;
    },
    getOrgsFulfilled: (state, action) => {
      const { orgs } = action.payload;
      state.orgs.allOrgs = orgs;
      state.orgs.error = null;
    },
    getOrgsRejected: (state, action: PayloadAction<IConfigurationActionRejected>) => {
      const { error } = action.payload;
      state.orgs.error = error;
    },
  },
});

const actions = {
  getEnvironments: createAction(`${moduleName}/getEnvironments`),
  getOrgs: createAction(`${moduleName}/getOrgs`),
};

export const ConfigurationActions = {
  ...actions,
  ...configurationSlice.actions,
};

export default configurationSlice.reducer;
