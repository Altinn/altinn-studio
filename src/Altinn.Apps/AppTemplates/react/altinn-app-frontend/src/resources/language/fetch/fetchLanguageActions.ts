import { Action } from 'redux';
import * as ActionTypes from './fetchLanguageActionTypes';

export interface IFetchLanguageFulfilled extends Action {
  language: any;
}
export interface IFetchLanguageRejected extends Action {
  error: Error;
}

export function fetchLanguage(): Action {
  return {
    type: ActionTypes.FETCH_LANGUAGE,
  };
}

export function fetchLanguageFulfilled(
  language: any,
): IFetchLanguageFulfilled {
  return {
    type: ActionTypes.FETCH_LANGUAGE_FULFILLED,
    language,
  };
}

export function fetchLanguageRejected(
  error: Error,
): IFetchLanguageRejected {
  return {
    type: ActionTypes.FETCH_LANGUAGE_REJECTED,
    error,
  };
}
