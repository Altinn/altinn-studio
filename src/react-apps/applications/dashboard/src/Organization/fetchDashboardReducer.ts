import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FetchDashboardActions from './fetchDashboardActions';
import * as FetchDashboardActionTypes from './fetchDashboardActionTypes';

export interface IDashboardStoreState {
  // dashboard: any;
  services: any;
  organizations: any;

}

const initialState: IDashboardStoreState = {
  // dashboard: {},
  services: [],
  organizations: [],
};

const dashboardReducer: Reducer<IDashboardStoreState> = (
  state: IDashboardStoreState = initialState,
  action?: Action,
): IDashboardStoreState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FetchDashboardActionTypes.FETCH_SERVICES_FULFILLED: {
      const { services } = action as FetchDashboardActions.IFetchServicesFulfilled;
      return update<IDashboardStoreState>(state, {
        $apply: () => ({
          ...state,
          services,
        }),
      });
    }
    case FetchDashboardActionTypes.FETCH_ORGANIZATIONS_FULFILLED: {
      const { organizations } = action as FetchDashboardActions.IFetchOrganizationsFulfilled;
      return update<IDashboardStoreState>(state, {
        $apply: () => ({
          ...state,
          organizations,
        }),
      });
    }
    default: { return state; }
  }
};

export default dashboardReducer;
