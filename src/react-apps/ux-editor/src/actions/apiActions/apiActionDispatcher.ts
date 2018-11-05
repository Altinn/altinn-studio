import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ApiActions from './actions';

export interface IApiActionDispatchers extends ActionCreatorsMapObject {
  addApiConnection: (newConnection: any) => ApiActions.IAddApiConnection;
  addApiConnectionFulfilled: (newConnection: any) => ApiActions.IAddApiConnectionFulfilled;
  addApiConnectionRejected: (error: Error) => ApiActions.IAddApiConnectionRejected;
  delApiConnection: (connectionId: any) => ApiActions.IDelApiConnection;
  delApiConnectionFulfilled: (newConnectionsObj: any) => ApiActions.IDelApiConnectionFulfilled;
  delApiConnectionRejected: (error: Error) => ApiActions.IDelApiConnectionRejected;
  checkIfApiShouldFetch: (
    lastUpdatedComponentId: string,
    lastUpdatedDataBinding: IDataModelFieldElement,
    lastUpdatedDataValue: string,
    repeating: boolean,
    dataModelGroup?: string,
    index?: number,
  ) => ApiActions.ICheckIfApiShouldFetchAction;
  fetchApiListResponse: () => ApiActions.IFetchApiListResponseAction;
}

const actions: IApiActionDispatchers = {
  addApiConnection: ApiActions.addApiConnection,
  addApiConnectionFulfilled: ApiActions.addApiConnectionFulfilled,
  addApiConnectionRejected: ApiActions.addApiConnectionRejected,
  delApiConnection: ApiActions.delApiConnection,
  delApiConnectionFulfilled: ApiActions.delApiConnectionFulfilled,
  delApiConnectionRejected: ApiActions.delApiConnectionRejected,
  checkIfApiShouldFetch: ApiActions.checkIfApiShouldFetch,
  fetchApiListResponse: ApiActions.fetchApiListResponse,
};

const ApiActionDispatchers: IApiActionDispatchers = bindActionCreators<
  any,
  IApiActionDispatchers
  >(actions, store.dispatch);

export default ApiActionDispatchers;
