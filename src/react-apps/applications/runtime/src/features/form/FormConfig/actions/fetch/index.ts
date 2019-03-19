import { Action } from 'redux';
import * as ActionTypes from '../types';

export interface IFetchFormConfig extends Action {
  url: string;
}

export interface IFetchFormConfigFulfilled extends Action {
  config: any;
}

export interface IFetchFormConfigRejected extends Action {
  error: Error;
}

export function fetchFormConfig(url: string): IFetchFormConfig {
  return {
    type: ActionTypes.FETCH_FORM_CONFIG,
    url,
  };
}

export function fetchFormConfigFulfilled(config: any): IFetchFormConfigFulfilled {
  return {
    type: ActionTypes.FETCH_FORM_CONFIG_FULFILLED,
    config,
  };
}

export function fetchFormConfigRejected(error: Error): IFetchFormConfigRejected {
  return {
    type: ActionTypes.FETCH_FORM_CONFIG_REJECTED,
    error,
  };
}