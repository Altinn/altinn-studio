import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FetchLanguageActions from './fetchLanguageActions';
import * as FetchLanguageActionTypes from './fetchLanguageActionTypes';

export interface ILanguageState {
  language: any;
}

const initialState: ILanguageState = {
  language: {},
};

const languageReducer: Reducer<ILanguageState> = (
  state: ILanguageState = initialState,
  action?: Action,
): ILanguageState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FetchLanguageActionTypes.FETCH_LANGUAGE_FULFILLED: {
      const { language } = action as FetchLanguageActions.IFetchLanguageFulfilled;
      return update<ILanguageState>(state, {
        language: {
          $set: language,
        },
      });
    }
    default: { return state; }
  }
};

export default languageReducer;
