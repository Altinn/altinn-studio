import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as FetchLanguage from './fetch';

export interface ILanguageActions extends ActionCreatorsMapObject {
  fetchLanguage: (
    url: string,
    languageCode: string,
  ) => FetchLanguage.IFetchLanguage;
  fetchLanguageFulfilled: (
    language: any,
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
