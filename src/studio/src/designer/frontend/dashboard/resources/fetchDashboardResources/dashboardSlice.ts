/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IRepository } from 'app-shared/types';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

export type User = {
  avatar_url: string;
  email: string;
  full_name: string;
  id: number;
  login: string;
};

export type SelectedContext = SelectedContextType | number;

export interface IDashboardState {
  services: IRepository[];
  user?: User;
  /* all, self or org-id*/
  selectedContext: SelectedContext;
}

const initialState: IDashboardState = {
  services: [],
  user: null,
  selectedContext: SelectedContextType.Self,
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

export interface ISetSelectedContext {
  selectedContext: SelectedContext;
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

    fetchServicesFulfilled: (
      state,
      action: PayloadAction<IFetchDashboardInfoActionFulfilled>,
    ) => {
      const { info } = action.payload;
      state.services = info;
    },
    setSelectedContext: (state, action: PayloadAction<ISetSelectedContext>) => {
      const { selectedContext } = action.payload;
      state.selectedContext = selectedContext;
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
