import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import * as FetchActions from './fetch';
import { store } from '../../../../store';

export interface IFormConfigActions extends ActionCreatorsMapObject {
  fetchFormConfig: (url: string) => FetchActions.IFetchFormConfig;
  fetchFormConfigFulfilled: (
    org: string,
    serviceName: string,
    repositoryName: string,
    serviceId: string,
  ) => FetchActions.IFetchFormConfigFulfilled;
  fetchFormConfigRejected: (error: Error) => FetchActions.IFetchFormConfigRejected;
}

const actions: IFormConfigActions = {
  fetchFormConfig: FetchActions.fetchFormConfig,
  fetchFormConfigFulfilled: FetchActions.fetchFormConfigFulfilled,
  fetchFormConfigRejected: FetchActions.fetchFormConfigRejected,
};

const FormConfigActions: IFormConfigActions = bindActionCreators(actions, store.dispatch);

export default FormConfigActions;
