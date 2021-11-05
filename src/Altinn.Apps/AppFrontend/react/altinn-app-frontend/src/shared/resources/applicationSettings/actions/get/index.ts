import { Action } from 'redux';
import { IApplicationSettings } from '../..';
import * as ApplicationSettingsActionTypes from '../types';

export function getApplicationSettings(): Action {
  return {
    type: ApplicationSettingsActionTypes.FETCH_APPLICATION_SETTINGS,
  };
}

export interface IGetApplicationSettingsFulfilled extends Action {
  applicationSettings: IApplicationSettings;
}

export function getApplicationSettingsFulfilled(
  applicationSettings: IApplicationSettings,
): IGetApplicationSettingsFulfilled {
  return {
    type: ApplicationSettingsActionTypes.FETCH_APPLICATION_SETTINGS_FULFILLED,
    applicationSettings,
  };
}

export interface IGetApplicationSettingsRejected extends Action {
  error: Error;
}

export function getApplicationSettingsRejected(
  error: Error,
): IGetApplicationSettingsRejected {
  return {
    type: ApplicationSettingsActionTypes.FETCH_APPLICATION_SETTINGS_REJECTED,
    error,
  };
}
