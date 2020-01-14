import { Action } from 'redux';
import * as ActionTypes from './fetchLanguageActionTypes';

export interface IFetchLanguageAction extends Action {
  url: string;
  languageCode: string;
}
export interface IFetchLanguageFulfilled extends Action {
  language: any;
}
export interface IFetchLanguageRejected extends Action {
  error: Error;
}

export function fetchLanguageAction(url: string, languageCode: string): IFetchLanguageAction {
  return {
    type: ActionTypes.FETCH_LANGUAGE,
    url,
    languageCode,
  };
}

export function fetchLanguageFulfilledAction(
  language: any,
): IFetchLanguageFulfilled {
  return {
    type: ActionTypes.FETCH_LANGUAGE_FULFILLED,
    language,
  };
}

export function fetchLanguageRejectedAction(
  error: Error,
): IFetchLanguageRejected {
  return {
    type: ActionTypes.FETCH_LANGUAGE_REJECTED,
    error,
  };
}
