import { Action } from 'redux';
import { IOption } from 'src/types';
import * as fetchOptionsActionTypes from './fetchOptionsActionTypes';

export interface IFetchOptionsAction extends Action {
  optionsId: string;
}

export interface IFetchOptionsFulfilledAction extends Action {
  optionsId: string;
  options: IOption[];
}

export interface IFetchOptionsRejectedAction extends Action {
  error: Error,
}

export function fetchOptions(optionsId: string): IFetchOptionsAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS,
    optionsId,
  };
}

export function fetchOptionsFulfilled(
  optionsId: string,
  options: IOption[],
): IFetchOptionsFulfilledAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS_FULFILLED,
    optionsId,
    options,
  };
}

export function fetchOptionsRejected(
  error: Error,
): IFetchOptionsRejectedAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS_REJECTED,
    error,
  };
}
