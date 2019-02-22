import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ManageServiceConfigurationActions from './actions';

export interface IManageServiceConfigurationActionDispatchers extends ActionCreatorsMapObject {
  fetchJsonFile: (
    url: string,
  ) => ManageServiceConfigurationActions.IFetchJsonFileAction;

  fetchJsonFileFulfilled: (
    data: any,
  ) => ManageServiceConfigurationActions.IFetchJsonFileFulfilledAction;

  fetchJsonFileRejected: (
    error: Error,
  ) => ManageServiceConfigurationActions.IFetchJsonFileRejectedAction;

  saveJsonFile: (
    url: string,
  ) => ManageServiceConfigurationActions.ISaveJsonFileAction;

  saveJsonFileFulfilled: (
    data: any,
  ) => Action;

  saveJsonFileRejected: (
    error: Error,
  ) => ManageServiceConfigurationActions.ISaveJsonFileRejectedAction;
}

const actions: IManageServiceConfigurationActionDispatchers = {
  fetchJsonFile: ManageServiceConfigurationActions.FetchJsonFile,
  fetchJsonFileFulfilled: ManageServiceConfigurationActions.FetchJsonFileFulfilled,
  fetchJsonFileRejected: ManageServiceConfigurationActions.FetchJsonFileRejected,
  saveJsonFile: ManageServiceConfigurationActions.SaveJsonFile,
  saveJsonFileFulfilled: ManageServiceConfigurationActions.SaveJsonFileFulfilled,
  saveJsonFileRejected: ManageServiceConfigurationActions.SaveJsonFileRejected,
};

const ManageServiceConfigurationDispatchers: IManageServiceConfigurationActionDispatchers = bindActionCreators<
  any,
  IManageServiceConfigurationActionDispatchers
  >(actions, store.dispatch);
export default ManageServiceConfigurationDispatchers;
