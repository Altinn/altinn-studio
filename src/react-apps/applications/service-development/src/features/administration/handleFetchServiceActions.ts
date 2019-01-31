import { Action } from 'redux';
import * as ActionTypes from './handleFetchServiceActionTypes';

export interface IFetchServiceAction extends Action {
  url: string;
}

export interface IFetchServiceFulfilled extends Action {
  result: any;
}

export interface IFetchServiceRejected extends Action {
  error: Error;
}

export function fetchServiceAction(url: string): IFetchServiceAction {
  return {
    type: ActionTypes.FETCH_SERVICE,
    url,
  };
}

export function fetchServiceFulfilledAction(result: any): IFetchServiceFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICE_FULFILLED,
    result,
  };
}

export function fetchServiceRejectedAction(error: Error): IFetchServiceRejected {
  return {
    type: ActionTypes.FETCH_SERVICE_REJECTED,
    error,
  };
}
