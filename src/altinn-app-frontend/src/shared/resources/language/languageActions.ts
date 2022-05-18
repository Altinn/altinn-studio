import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as FetchLanguage from './fetch/fetchLanguageActions';

export type ILanguageActions = typeof actions;

const actions = {
  fetchLanguage: FetchLanguage.fetchLanguage,
  fetchLanguageFulfilled: FetchLanguage.fetchLanguageFulfilled,
  fetchLanguageRecjeted: FetchLanguage.fetchLanguageRejected,
};

const LanguageActions: ILanguageActions = bindActionCreators<any, any>(actions, store.dispatch);

export default LanguageActions;
