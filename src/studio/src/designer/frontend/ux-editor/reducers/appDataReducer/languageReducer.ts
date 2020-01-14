import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import fallbackLanguage from 'app-shared/fallbackLanguage';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface ILanguageState {
  language: any;
}

const initialState: ILanguageState = {
  language: fallbackLanguage,
};

const languageReducer: Reducer<ILanguageState> = (
  state: ILanguageState = initialState,
  action?: Action,
): ILanguageState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case AppDataActionTypes.FETCH_LANGUAGE_FULFILLED: {
      const { language } = action as AppDataActions.IFetchLanguageFulfilled;
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
