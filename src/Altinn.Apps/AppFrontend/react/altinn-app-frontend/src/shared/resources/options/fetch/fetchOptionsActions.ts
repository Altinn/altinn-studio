import { Action } from 'redux';
import { IOptionData } from 'src/types';
import * as fetchOptionsActionTypes from './fetchOptionsActionTypes';

export interface IFetchOptionsFulfilledAction extends Action {
  optionsKey: string;
  optionData: IOptionData;
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
  error: Error,
): IFetchOptionsRejectedAction {
  return {
    type: fetchOptionsActionTypes.FETCH_OPTIONS_REJECTED,
    error,
  };
}
