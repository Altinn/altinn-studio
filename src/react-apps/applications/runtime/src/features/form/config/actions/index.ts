import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import * as FetchFormConfigActions from './fetch';
import { store } from '../../../../store';

export interface IFormConfigActions extends ActionCreatorsMapObject {
  fetchFormConfig: (url: string) => FetchFormConfigActions.IFetchFormConfig;
  fetchFormConfigFulfilled: (
    org: string,
    serviceName: string,
    repositoryName: string,
    serviceId: string,
  ) => FetchFormConfigActions.IFetchFormConfigFulfilled;
  fetchFormConfigRejected: (error: Error) => FetchFormConfigActions.IFetchFormConfigRejected;
}

const actions: IFormConfigActions = {
  fetchFormConfig: FetchFormConfigActions.fetchFormConfig,
  fetchFormConfigFulfilled: FetchFormConfigActions.fetchFormConfigFulfilled,
  fetchFormConfigRejected: FetchFormConfigActions.fetchFormConfigRejected,
};

const FormConfigActions: IFormConfigActions = bindActionCreators(actions, store.dispatch);

export default FormConfigActions;
