import { ILanguage } from 'altinn-shared/types';
import { Action } from 'redux';
import * as ActionTypes from './fetchLanguageActionTypes';

export interface IFetchLanguageFulfilled extends Action {
  language: ILanguage;
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
  language: ILanguage,
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
