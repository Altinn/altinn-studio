import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as NavigationActionTypes from '../../actions/navigationActions/navigationActionTypes';

export interface IServiceDevelopmentState {
  drawerOpen: boolean;
}

const initialState: IServiceDevelopmentState = {
  drawerOpen: false,
};

const serviceDevelopmentReducer: Reducer<IServiceDevelopmentState> = (
  state: IServiceDevelopmentState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case NavigationActionTypes.TOGGLE_DRAWER: {
      return update<IServiceDevelopmentState>(state, {
        drawerOpen: {
          $set: !state.drawerOpen,
        },
      });
    }
    default:
      return state;
  }
};

export default serviceDevelopmentReducer;
