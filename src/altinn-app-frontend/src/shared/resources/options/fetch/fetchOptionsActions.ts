import { Action } from 'redux';
import type { IOptionsMetaData, IOption } from 'src/types';
import * as fetchOptionsActionTypes from './fetchOptionsActionTypes';

export interface IFetchOptionsFulfilledAction extends Action {
  optionsKey: string;
  options: IOption[];
}

export interface IFetchingOptionsAction extends Action {
  optionsKey: string;
  optionMetaData: IOptionsMetaData,
}

export interface IFetchOptionsRejectedAction extends Action {
  optionsKey: string;
  error: Error;
}

export function fetchOptions(): Action {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS,
  };
}

export function fetchingOptions(
  optionsKey: string,
  optionMetaData: IOptionsMetaData,
): IFetchingOptionsAction {
  return {
    type: fetchOptionsActionTypes.FETCHING_OPTION,
    optionsKey,
    optionMetaData,
  };
}

export function fetchOptionsFulfilled(
  optionsKey: string,
  options: IOption[],
): IFetchOptionsFulfilledAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS_FULFILLED,
    optionsKey,
    options,
  };
}

export function fetchOptionsRejected(
  optionsKey: string,
  error: Error,
): IFetchOptionsRejectedAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS_REJECTED,
    optionsKey,
    error,
  };
}
