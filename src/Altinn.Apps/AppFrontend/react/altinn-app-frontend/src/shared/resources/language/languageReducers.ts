import { ILanguage } from 'altinn-shared/types';
import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IFetchLanguageFulfilled, IFetchLanguageRejected } from './fetch/fetchLanguageActions';
import * as LanguageActionTypes from './fetch/fetchLanguageActionTypes';

export interface ILanguageState {
  language: ILanguage;
  error: Error;
}

const initialState: ILanguageState = {
  language: null,
  error: null,
};

const languageReducer: Reducer<ILanguageState> = (
  state: ILanguageState = initialState,
  action?: Action,
): ILanguageState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case LanguageActionTypes.FETCH_LANGUAGE_FULFILLED: {
      const { language } = action as IFetchLanguageFulfilled;
      return update<ILanguageState>(state, {
        language: {
          $set: language,
        },
      });
    }
    case LanguageActionTypes.FETCH_LANGUAGE_REJECTED: {
      const { error } = action as IFetchLanguageRejected;
      return update<ILanguageState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: { return state; }
  }
};

export default languageReducer;
