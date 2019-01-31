import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as FetchServiceActions from './handleFetchServiceActions';

/**
 * Define a interface describing the the different Actions available
 * for fetching service.
 */
export interface IHandleFetchServiceDispatchers extends ActionCreatorsMapObject {
  fetchService: (url: string) => FetchServiceActions.IFetchServiceAction;
  fetchServiceFulfilled: (result: any) => FetchServiceActions.IFetchServiceFulfilled;
  fetchServiceRejected: (result: Error) => FetchServiceActions.IFetchServiceRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IHandleFetchServiceDispatchers = {
  fetchService: FetchServiceActions.fetchServiceAction,
  fetchServiceFulfilled: FetchServiceActions.fetchServiceFulfilledAction,
  fetchServiceRejected: FetchServiceActions.fetchServiceRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const HandleFetchServiceActionDispatchers: IHandleFetchServiceDispatchers = bindActionCreators<
  any,
  IHandleFetchServiceDispatchers
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default HandleFetchServiceActionDispatchers;
