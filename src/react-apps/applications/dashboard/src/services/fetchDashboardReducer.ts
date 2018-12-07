import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FetchDashboardActions from './fetchDashboardActions';
import * as FetchDashboardActionTypes from './fetchDashboardActionTypes';

export interface IDashboardStoreState {
  services: any;
  user: any;

}

const initialState: IDashboardStoreState = {
  services: [],
  user: {},
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
    case FetchDashboardActionTypes.FETCH_CURRENT_USER_FULFILLED: {
      const { user } = action as FetchDashboardActions.IFetchCurrentUserFulfilled;
      return update<IDashboardStoreState>(state, {
        $apply: () => ({
          ...state,
          user,
        }),
      });
    }
    default: { return state; }
  }
};

export default dashboardReducer;
