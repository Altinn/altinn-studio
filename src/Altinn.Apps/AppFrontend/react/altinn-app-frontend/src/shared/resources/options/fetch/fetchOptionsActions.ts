import { Action } from 'redux';
import { IOption } from 'src/types/global';
import * as fetchOptionsActionTypes from './fetchOptionsActionTypes';

export interface IFetchOptionsFulfilledAction extends Action {
  optionsId: string;
  options: IOption[];
}

export interface IFetchOptionsRejectedAction extends Action {
  error: Error,
}

export function fetchOptions(): Action {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS,
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
