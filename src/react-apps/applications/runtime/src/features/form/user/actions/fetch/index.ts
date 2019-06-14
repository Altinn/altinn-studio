import { Action } from 'redux';
import * as ActionTypes from '../types';

export interface IFetchFormUser extends Action {
  url: string;
}

export interface IFetchFormUserFulfilled extends Action {
  firstName: string;
  middleName: string;
  lastName: string;
  organization: string;
}

export interface IFetchFormUserRejected extends Action {
  error: Error;
}

export function fetchFormUser(url: string): IFetchFormUser {
  return {
    type: ActionTypes.FETCH_FORM_USER,
    url,
  };
}

export function fetchFormUserFulfilled(
  firstName: string,
  middleName: string,
  lastName: string,
  organization: string,
): IFetchFormUserFulfilled {
  return {
    type: ActionTypes.FETCH_FORM_USER_FULFILLED,
    firstName,
    middleName,
    lastName,
    organization,
  };
}

export function fetchFormUserRejected(error: Error): IFetchFormUserRejected {
  return {
    type: ActionTypes.FETCH_FORM_USER_REJECTED,
    error,
  };
}
