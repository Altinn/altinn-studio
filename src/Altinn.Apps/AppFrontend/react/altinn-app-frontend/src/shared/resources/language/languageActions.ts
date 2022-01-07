import { ILanguage } from 'altinn-shared/types';
import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as FetchLanguage from './fetch/fetchLanguageActions';

export interface ILanguageActions extends ActionCreatorsMapObject {
  fetchLanguage: () => Action;
  fetchLanguageFulfilled: (
    language: ILanguage,
  ) => FetchLanguage.IFetchLanguageFulfilled;
  fetchLanguageRecjeted: (
    error: Error,
  ) => FetchLanguage.IFetchLanguageRejected;
}

const actions: ILanguageActions = {
  fetchLanguage: FetchLanguage.fetchLanguage,
  fetchLanguageFulfilled: FetchLanguage.fetchLanguageFulfilled,
  fetchLanguageRecjeted: FetchLanguage.fetchLanguageRejected,
};

const LanguageActions: ILanguageActions = bindActionCreators<any, any>(actions, store.dispatch);

export default LanguageActions;
