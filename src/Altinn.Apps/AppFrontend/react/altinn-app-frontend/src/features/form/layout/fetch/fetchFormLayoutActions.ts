import { Action } from 'redux';
import { ILayoutSettings, INavigationConfig } from 'src/types';
import { ILayouts } from '..';
import * as actionTypes from '../formLayoutActionTypes';

export interface IFetchFormLayout extends Action {
  url: string;
}

export function fetchFormLayout(url: string): IFetchFormLayout {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT,
    url,
  };
}

export interface IFetchFormLayoutFulfilled extends Action {
  layouts: ILayouts;
  navigationConfig?: INavigationConfig;
}

export function fetchFormLayoutFulfilled(
  layouts: ILayouts,
  navigationConfig: INavigationConfig,
): IFetchFormLayoutFulfilled {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_FULFILLED,
    layouts,
    navigationConfig,
  };
}

export interface IFetchFormLayoutRejected extends Action {
  error: Error;
}

export function fetchFormLayoutRejected(error: Error): IFetchFormLayoutRejected {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_REJECTED,
    error,
  };
}

export interface IFetchFormLayoutSettingsFulfilled extends Action {
  settings: ILayoutSettings;
}

export interface IFetchFormLayoutSettingsRejected extends Action {
  error: Error;
}

export function fetchFormLayoutSettings(): Action {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_SETTINGS,
  };
}

export function fetchFormLayoutSettingsFulfilled(settings: ILayoutSettings): IFetchFormLayoutSettingsFulfilled {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_SETTINGS_FULFILLED,
    settings,
  };
}

export function fetchFormLayoutSettingsRejected(error: Error): IFetchFormLayoutSettingsRejected {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_SETTINGS_REJECTED,
    error,
  };
}
