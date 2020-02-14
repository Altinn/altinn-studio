import { Action } from 'redux';
import * as ActionTypes from './fetchFormConfigActionTypes';

export interface IFetchFormConfig extends Action {
  url: string;
}

export interface IFetchFormConfigFulfilled extends Action {
  org: string;
  serviceName: string;
  repositoryName: string;
  serviceId: string;
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

export function fetchFormConfigFulfilled(
  org: string,
  serviceName: string,
  repositoryName: string,
  serviceId: string,
): IFetchFormConfigFulfilled {
  return {
    type: ActionTypes.FETCH_FORM_CONFIG_FULFILLED,
    org,
    serviceId,
    serviceName,
    repositoryName,
  };
}

export function fetchFormConfigRejected(error: Error): IFetchFormConfigRejected {
  return {
    type: ActionTypes.FETCH_FORM_CONFIG_REJECTED,
    error,
  };
}
