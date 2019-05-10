import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as FetchLanguageActions from './fetchLanguageActions';

/**
 * Define a interface describing the the different Actions available
 * for fetching language and which datamodel those actions expect.
 */
export interface IFetchLanguageDispatchers extends ActionCreatorsMapObject {
  fetchLanguage: (
    url: string,
    languageCode: string,
  ) => FetchLanguageActions.IFetchLanguageAction;
  fetchLanguageFulfilled: (
    language: any,
  ) => FetchLanguageActions.IFetchLanguageFulfilled;
  fetchLanguageRejected: (
    error: Error,
  ) => FetchLanguageActions.IFetchLanguageRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */
const actions: IFetchLanguageDispatchers = {
  fetchLanguage: FetchLanguageActions.fetchLanguageAction,
  fetchLanguageFulfilled: FetchLanguageActions.fetchLanguageFulfilledAction,
  fetchLanguageRejected: FetchLanguageActions.fetchLanguageRejectedAction,

};

/**
 * Bind action creators to redux store
 */
const FetchLanguageActionDispatchers: IFetchLanguageDispatchers = bindActionCreators<
  any,
  IFetchLanguageDispatchers
>(actions, store.dispatch);

/**
 * Export the App Config dispatcher to be used from REACT components
 */
export default FetchLanguageActionDispatchers;
