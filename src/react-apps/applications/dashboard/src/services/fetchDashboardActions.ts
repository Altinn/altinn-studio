import { Action } from 'redux';
import * as ActionTypes from './fetchDashboardActionTypes';

/* Actions for fetching services */
export interface IFetchServicesAction extends Action {
  url: string;
}
export interface IFetchServicesFulfilled extends Action {
  services: any;
}
export interface IFetchServicesRejected extends Action {
  error: Error;
}

export function fetchServicesAction(url: string): IFetchServicesAction {
  return {
    type: ActionTypes.FETCH_SERVICES,
    url,
  };
}

export function fetchServicesFulfilledAction(
  services: any,
): IFetchServicesFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICES_FULFILLED,
    services,
  };
}

export function fetchServicesRejectedAction(
  error: Error,
): IFetchServicesRejected {
  return {
    type: ActionTypes.FETCH_SERVICES_REJECTED,
    error,
  };
}

/* Actions for fetching current user */
export interface IFetchCurrentUserAction extends Action {
  url: string;
}
export interface IFetchCurrentUserFulfilled extends Action {
  user: any;
}
export interface IFetchCurrentUserRejected extends Action {
  error: Error;
}

export function fetchCurrentUserAction(url: string): IFetchCurrentUserAction {
  return {
    type: ActionTypes.FETCH_CURRENT_USER,
    url,
  };
}

export function fetchCurrentUserFulfilledAction(
  user: any,
): IFetchCurrentUserFulfilled {
  return {
    type: ActionTypes.FETCH_CURRENT_USER_FULFILLED,
    user,
  };
}

export function fetchCurrentUserRejectedAction(
  error: Error,
): IFetchCurrentUserRejected {
  return {
    type: ActionTypes.FETCH_CURRENT_USER_REJECTED,
    error,
  };
}
