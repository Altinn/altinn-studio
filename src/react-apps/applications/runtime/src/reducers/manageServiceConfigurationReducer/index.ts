import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ManageJsonFileActionTypes from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionTypes';

export interface IManageServiceConfigurationState {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  saving: boolean;
  saved: boolean;
}

const initialState: IManageServiceConfigurationState = {
  fetching: false,
  fetched: false,
  error: null,
  saving: false,
  saved: false,
};

const manageServiceConfigurationReducer: Reducer<IManageServiceConfigurationState> = (
  state: IManageServiceConfigurationState = initialState,
  action?: Action,
): IManageServiceConfigurationState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ManageJsonFileActionTypes.FETCH_JSON_FILE: {
      return update<IManageServiceConfigurationState>(state, {
        fetching: {
          $set: true,
        },
      });
    }

    case ManageJsonFileActionTypes.FETCH_JSON_FILE_FULFILLED: {
      return update<IManageServiceConfigurationState>(state, {
        fetched: {
          $set: true,
        },
        fetching: {
          $set: false,
        },
      });
    }

    case ManageJsonFileActionTypes.SAVE_JSON_FILE: {
      return update<IManageServiceConfigurationState>(state, {
        saving: {
          $set: true,
        },
      });
    }

    case ManageJsonFileActionTypes.SAVE_JSON_FILE_FULFILLED: {
      return update<IManageServiceConfigurationState>(state, {
        saved: {
          $set: true,
        },
        saving: {
          $set: false,
        },
      });
    }

    default: {
      return state;
    }
  }
};

export default manageServiceConfigurationReducer;
