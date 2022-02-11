import { Action } from 'redux';
import { IOptionData } from 'src/types';
import * as fetchOptionsActionTypes from './fetchOptionsActionTypes';

export interface IFetchOptionsFulfilledAction extends Action {
  optionsKey: string;
  optionData: IOptionData;
}

export interface IFetchingOptionsAction extends Action {
  optionsKey: string;
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
  optionsKey: string
): IFetchingOptionsAction {
  return {
    type: fetchOptionsActionTypes.FETCHING_OPTION,
    optionsKey,
  };
}

export function fetchOptionsFulfilled(
  optionsKey: string,
  optionData: IOptionData,
): IFetchOptionsFulfilledAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS_FULFILLED,
    optionsKey,
    optionData,
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
