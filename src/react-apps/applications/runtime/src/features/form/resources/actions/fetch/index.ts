import { Action } from 'redux';
import * as ActionTypes from '../types';

export interface IFetchFormResource extends Action {
  url: string;
}

export interface IFetchFormResourceFulfilled extends Action {
  resource: any;
}

export interface IFetchFormResourceRejected extends Action {
  error: Error;
}

export function fetchFormResource(url: string): IFetchFormResource {
  return {
    type: ActionTypes.FETCH_FORM_RESOURCES,
    url,
  };
}

export function fetchFormResourceFulfilled(resource: any): IFetchFormResourceFulfilled {
  return {
    type: ActionTypes.FETCH_FORM_RESOURCES_FULFILLED,
    resource,
  };
}

export function fetchFormResourceRejected(error: Error): IFetchFormResourceRejected {
  return {
    type: ActionTypes.FETCH_FORM_RESOURCES_REJECTED,
    error,
  };
}
