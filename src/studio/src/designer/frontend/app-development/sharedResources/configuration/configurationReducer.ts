import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ConfigurationActionTypes from './configurationActionTypes';
import * as GetEnvironmentsActions from './getEnvironments/getEnvironmentsActions';
import * as GetOrgsActions from './getOrgs/getOrgsActions';

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

    case ConfigurationActionTypes.GET_ORGS_FULFILLED: {
      const { orgs } = action as GetOrgsActions.IGetOrgsFulfilled;
      return update<IConfigurationState>(state, {
        orgs: {
          allOrgs: {
            $set: orgs,
          },
        },
      });
    }

    case ConfigurationActionTypes.GET_ORGS_REJECTED: {
      const { error } = action as GetOrgsActions.IGetOrgsRejected;
      return update<IConfigurationState>(state, {
        orgs: {
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
