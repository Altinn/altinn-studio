import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IApplicationSettings } from '..';
import { IGetApplicationSettingsFulfilled, IGetApplicationSettingsRejected } from '../actions/get';
import * as ApplicationSettingsActionTypes from '../actions/types';

export interface IApplicationSettingsState {
  applicationSettings: IApplicationSettings;
  error: Error;
}

const initialState: IApplicationSettingsState = {
  applicationSettings: null,
  error: null,
};

const applicationSettingsReducer: Reducer<IApplicationSettingsState> = (
  state: IApplicationSettingsState = initialState,
  action?: Action,
): IApplicationSettingsState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case ApplicationSettingsActionTypes.FETCH_APPLICATION_SETTINGS_FULFILLED: {
      const { applicationSettings } = action as IGetApplicationSettingsFulfilled;
      return update<IApplicationSettingsState>(state, {
        applicationSettings: {
          $set: applicationSettings,
        },
        error: {
          $set: null,
        },
      });
    }
    case ApplicationSettingsActionTypes.FETCH_APPLICATION_SETTINGS_REJECTED: {
      const { error } = action as IGetApplicationSettingsRejected;
      return update<IApplicationSettingsState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default applicationSettingsReducer;
