import { Action } from 'redux';
import * as ActionTypes from './fetchOrgsActionTypes';

export type IFetchOrgs = Action;
export interface IFetchOrgsFulfilled extends Action {
  orgs: any;
}
export interface IFetchOrgsRejected extends Action {
  error: Error;
}

export function fetchOrgs(): IFetchOrgs {
  return {
    type: ActionTypes.FETCH_ORGS,
  };
}

export function fetchOrgsFulfilled(orgs: any): IFetchOrgsFulfilled {
  return {
    type: ActionTypes.FETCH_ORGS_FULFILLED,
    orgs,
  };
}

export function fetchOrgsRejected(error: Error): IFetchOrgsRejected {
  return {
    type: ActionTypes.FETCH_ORGS_REJECTED,
    error,
  };
}
