import { IRepository } from 'app-shared/types';
import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FetchDashboardActions from './fetchDashboardActions';
import * as FetchDashboardActionTypes from './fetchDashboardActionTypes';

export interface IDashboardState {
  services: IRepository[];
  user: any;
  organisations: any;
}

const initialState: IDashboardState = {
  services: [],
  user: {},
  organisations: [],
};

const dashboardReducer: Reducer<IDashboardState> = (
  state: IDashboardState = initialState,
  action?: Action,
): IDashboardState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FetchDashboardActionTypes.FETCH_SERVICES_FULFILLED: {
      const { services } = action as FetchDashboardActions.IFetchServicesFulfilled;
      return update<IDashboardState>(state, {
        $apply: () => ({
          ...state,
          services,
        }),
      });
    }
    case FetchDashboardActionTypes.FETCH_CURRENT_USER_FULFILLED: {
      const { user } = action as FetchDashboardActions.IFetchCurrentUserFulfilled;
      return update<IDashboardState>(state, {
        $apply: () => ({
          ...state,
          user,
        }),
      });
    }
    case FetchDashboardActionTypes.FETCH_ORGANISATIONS_FULFILLED: {
      const { organisations } = action as FetchDashboardActions.IFetchOrganisationsFulfilled;
      return update<IDashboardState>(state, {
        $apply: () => ({
          ...state,
          organisations,
        }),
      });
    }
    default: { return state; }
  }
};

export default dashboardReducer;
