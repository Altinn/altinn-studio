import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';
import * as FetchFormConfigActions from './fetch/fetchFormConfigActions';

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
