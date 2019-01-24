import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as FetchRepoStatusActions from './handleMergeConflictActions';

/**
 * Define a interface describing the the different Actions available
 * for fetching language and which datamodel those actions expect.
 */
export interface IHandleMergeConflictDispatchers extends ActionCreatorsMapObject {
  fetchRepoStatus: (url: string, org: string, repo: string) => FetchRepoStatusActions.IFetchRepoStatusAction;
  fetchRepoStatusFulfilled: (result: any) => FetchRepoStatusActions.IFetchRepoStatusFulfilled;
  fetchRepoStatusRejected: (result: Error) => FetchRepoStatusActions.IFetchRepoStatusRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IHandleMergeConflictDispatchers = {
  fetchRepoStatus: FetchRepoStatusActions.fetchRepoStatusAction,
  fetchRepoStatusFulfilled: FetchRepoStatusActions.fetchRepoStatusFulfilledAction,
  fetchRepoStatusRejected: FetchRepoStatusActions.fetchRepoStatusRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const HandleMergeConflictActionDispatchers: IHandleMergeConflictDispatchers = bindActionCreators<
  any,
  IHandleMergeConflictDispatchers
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default HandleMergeConflictActionDispatchers;
