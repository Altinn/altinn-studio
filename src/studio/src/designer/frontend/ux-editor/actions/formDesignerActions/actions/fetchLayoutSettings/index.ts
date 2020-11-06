import { ILayoutSettings } from 'app-shared/types';
import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IFetchLayoutSettingsFulfilledAction extends Action {
  settings: ILayoutSettings;
}

export interface IFetchLayoutSettingsRejectedAction extends Action {
  error: Error;
}

export function fetchLayoutSettings(): Action {
  return {
    type: ActionTypes.FETCH_LAYOUT_SETTINGS,
  };
}

export function fetchLayoutSettingsFulfilled(
  settings: ILayoutSettings,
): IFetchLayoutSettingsFulfilledAction {
  return {
    type: ActionTypes.FETCH_LAYOUT_SETTINGS_FULFILLED,
    settings,
  };
}

export function fetchLayoutSettingsRejected(
  error: Error,
): IFetchLayoutSettingsRejectedAction {
  return {
    type: ActionTypes.FETCH_LAYOUT_SETTINGS_REJECTED,
    error,
  };
}
