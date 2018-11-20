// import update from 'immutability-helper';
import { Action, Reducer } from 'redux';

export interface IDashboardState {}

const initialState: IDashboardState = {};

const dashboardReducer: Reducer<IDashboardState> = (
  state: IDashboardState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    default:
      return state;
  }
};

export default dashboardReducer;
