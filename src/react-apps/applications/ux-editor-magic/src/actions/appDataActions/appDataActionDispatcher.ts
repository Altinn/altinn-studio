import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as AppDataActions from './actions';

/**
 * Define a interface describing the the different Actions available
 * for AppConfig and which datamodel those actions expect.
 */
export interface IAppConfigActionDispatchers extends ActionCreatorsMapObject {
  fetchDataModel: (url: string) => AppDataActions.IFetchDataModelAction;
  fetchDataModelFulfilled: (
    dataModel: IDataModelFieldElement[],
  ) => AppDataActions.IFetchDataModelFulfilled;
  fetchDataModelRejected: (
    error: Error,
  ) => AppDataActions.IFetchDataModelRejected;
  setDesignMode: (designMode: boolean) => AppDataActions.ISetDesignModeAction;
  setDesignModeFulfilled: () => Action;
  setDesignModeRejected: (
    error: Error,
  ) => AppDataActions.ISetDesignModeActionRejected;
  fetchRuleModel: (url: string) => AppDataActions.IFetchRuleModelAction;
  fetchRuleModelFulfilled: (
    ruleModel: IRuleModelFieldElement[],
  ) => AppDataActions.IFetchRuleModelFulfilled;
  fetchRuleModelRejected: (
    error: Error,
  ) => AppDataActions.IFetchRuleModelRejected;
  fetchLanguage: (
    url: string,
    languageCode: string,
  ) => AppDataActions.IFetchLanguageAction;
  fetchLanguageFulfilled: (
    languageCode: string,
  ) => AppDataActions.IFetchLanguageFulfilled;
  fetchLanguageRecjeted: (
    error: Error,
  ) => AppDataActions.IFetchLanguageRejected;
  loadTextResources: (url: string) => AppDataActions.ILoadTextResourcesAction;
  loadTextResourcesFulfilled: (textResources: any) => AppDataActions.ILoadTextResourcesFulfilled;
  loadTextResourcesRejected: (error: Error) => AppDataActions.ILoadTextResourcesRejected;
  fetchCodeLists: (url: string) => AppDataActions.IFetchCodeListsAction;
  fetchCodeListsFulfilled: (codeList: any) => AppDataActions.IFetchCodeListsFulfilled;
  fetchCodeListsRejected: (error: Error) => AppDataActions.IFetchCodeListsRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */
const actions: IAppConfigActionDispatchers = {
  fetchDataModel: AppDataActions.fetchLayoutDataModelAction,
  fetchDataModelFulfilled: AppDataActions.fetchLayoutDataModelFulfilledAction,
  fetchDataModelRejected: AppDataActions.fetchLayoutDataModelRejectedAction,
  setDesignMode: AppDataActions.setDesignModeAction,
  setDesignModeFulfilled: AppDataActions.setDesignModeActionFulfilled,
  setDesignModeRejected: AppDataActions.setDesignModeActionRejected,
  fetchRuleModel: AppDataActions.fetchRuleModelAction,
  fetchRuleModelFulfilled: AppDataActions.fetchRuleModelFulfilledAction,
  fetchRuleModelRejected: AppDataActions.fetchRuleModelRejectedAction,
  loadTextResources: AppDataActions.loadTextResourcesAction,
  loadTextResourcesFulfilled: AppDataActions.loadTextResourcesFulfilledAction,
  loadTextResourcesRejected: AppDataActions.loadTextResourcesRejectedAction,
  fetchCodeLists: AppDataActions.fetchCodeListsAction,
  fetchCodeListsFulfilled: AppDataActions.fetchCodeListsFulfilledAction,
  fetchCodeListsRejected: AppDataActions.fetchCodeListsRejectedAction,
  fetchLanguage: AppDataActions.fetchLanguageAction,
  fetchLanguageFulfilled: AppDataActions.fetchLanguageFulfilledAction,
  fetchLanguageRecjeted: AppDataActions.fetchLanguageRejectedAction,

};

/**
 * Bind action creators to redux store
 */
const AppConfigActionDispatchers: IAppConfigActionDispatchers = bindActionCreators<
  any,
  IAppConfigActionDispatchers
  >(actions, store.dispatch);

/**
 * Export the App Config dispatcher to be used from REACT components
 */
export default AppConfigActionDispatchers;
