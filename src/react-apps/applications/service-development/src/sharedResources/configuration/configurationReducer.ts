import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ConfigurationActionTypes from './configurationActionTypes';
import * as GetEnvironmentsActions from './getEnvironments/getEnvironmentsActions';

export interface IConfigurationState {
  environments: IEnvironmentsConfigurationState;
}

interface IEnvironmentsConfigurationState {
  result: any;
  error: Error;
}

// TODO: iterate over environments?
const initialState: IConfigurationState = {
  environments: {
    result: null,
    error: null,
  },
};

const configurationReducer: Reducer<IConfigurationState> = (
  state: IConfigurationState = initialState,
  action?: Action,
): IConfigurationState => {
  if (!action) {
    return state;
  }
  switch (action.type) {

    case ConfigurationActionTypes.GET_ENVIRONMENTS_FULFILLED: {
      const { result } = action as GetEnvironmentsActions.IGetEnvironmentsFulfilled;
      return update<IConfigurationState>(state, {
        environments: {
          result: {
            $set: result.environments,
          },
          error: {
            $set: null,
          },
        },
      });
    }

    case ConfigurationActionTypes.GET_ENVIRONMENTS_REJECTED: {
      const { error } = action as GetEnvironmentsActions.IGetEnvironmentsRejected;
      return update<IConfigurationState>(state, {
        environments: {
          error: {
            $set: error,
          },
        },
      });
    }

    default: { return state; }
  }
};

export default configurationReducer;
