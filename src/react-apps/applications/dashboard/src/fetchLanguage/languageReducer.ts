import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FetchLanguageActions from './fetchLanguageActions';
import * as FetchLanguageActionTypes from './fetchLanguageActionTypes';

export interface IFetchedLanguageState {
  language: any;
}

const initialState: IFetchedLanguageState = {
  language: {},
};

const languageReducer: Reducer<IFetchedLanguageState> = (
  state: IFetchedLanguageState = initialState,
  action?: Action,
): IFetchedLanguageState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FetchLanguageActionTypes.FETCH_LANGUAGE_FULFILLED: {
      const { language } = action as FetchLanguageActions.IFetchLanguageFulfilled;
      return update<IFetchedLanguageState>(state, {
        language: {
          $set: language,
        },
      });
    }
    default: { return state; }
  }
};

export default languageReducer;
