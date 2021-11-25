/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IRepository } from 'app-shared/types';

export type User = {
  avatar_url: string;
  email: string;
  full_name: string;
  id: number;
  login: string;
};

export type Organisations = Array<string>;

export interface IDashboardState {
  services: IRepository[];
  user?: User;
  organisations: Organisations;
}

const initialState: IDashboardState = {
  services: [],
  user: null,
  organisations: [],
};

export interface IFetchDashboardInfoAction {
  url: string;
}

export interface IFetchDashboardInfoActionFulfilled {
  info: any;
}

export interface IFetchDashboardInfoActionRejected {
  error: Error;
}

const moduleName = 'dashboard';
const dashboardSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchCurrentUserFulfilled: (
      state,
      action: PayloadAction<IFetchDashboardInfoActionFulfilled>,
    ) => {
      const { info } = action.payload;
      state.user = info;
    },
    fetchOrganisationsFulfilled: (
      state,
      action: PayloadAction<IFetchDashboardInfoActionFulfilled>,
    ) => {
      const { info } = action.payload;
      state.organisations = info;
    },
    fetchServicesFulfilled: (
      state,
      action: PayloadAction<IFetchDashboardInfoActionFulfilled>,
    ) => {
      const { info } = action.payload;
      state.services = info;
    },
  },
});

const actions = {
  fetchCurrentUser: createAction<IFetchDashboardInfoAction>(
    `${moduleName}/fetchCurrentUser`,
  ),
  fetchCurrentUserRejected: createAction<IFetchDashboardInfoActionRejected>(
    `${moduleName}/fetchCurrentUserRejected`,
  ),
  fetchOrganisations: createAction<IFetchDashboardInfoAction>(
    `${moduleName}/fetchOrganisations`,
  ),
  fetchOrganisationsRejected: createAction<IFetchDashboardInfoActionRejected>(
    `${moduleName}/fetchOrganisationsRejected`,
  ),
  fetchServices: createAction<IFetchDashboardInfoAction>(
    `${moduleName}/fetchServices`,
  ),
  fetchServicesRejected: createAction<IFetchDashboardInfoActionRejected>(
    `${moduleName}/fetchServicesRejected`,
  ),
};

export const DashboardActions = {
  ...actions,
  ...dashboardSlice.actions,
};

export default dashboardSlice.reducer;
