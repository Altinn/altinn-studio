import { Action } from 'redux';
import * as ActionTypes from './fetchLanguageActionTypes';

export interface IFetchLanguage extends Action {
  url: string;
  languageCode: string;
}
export interface IFetchLanguageFulfilled extends Action {
  language: any;
}
export interface IFetchLanguageRejected extends Action {
  error: Error;
}

export function fetchLanguage(url: string, languageCode: string): IFetchLanguage {
  return {
    type: ActionTypes.FETCH_LANGUAGE,
    url,
    languageCode,
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
