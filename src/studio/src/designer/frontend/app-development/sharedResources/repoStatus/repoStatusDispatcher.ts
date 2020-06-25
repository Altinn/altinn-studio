/* tslint:disable:max-line-length */
import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as GetRepoStatusActions from './get/getMasterRepoStatusActions';
import * as ResetLocalRepoActions from './reset/resetLocalRepoActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IRepoStatusDispatchers extends ActionCreatorsMapObject {
  getMasterRepoStatus: (org: string, repo: string) => GetRepoStatusActions.IGetMasterRepoStatus;
  getMasterRepoStatusFulfilled: (result: any) => GetRepoStatusActions.IGetMasterRepoStatusFulfilled;
  getMasterRepoStatusRejected: (result: Error) => GetRepoStatusActions.IGetMasterRepoStatusRejected;
  resetLocalRepo: (org: string, repo: string) => ResetLocalRepoActions.IResetLocalRepo;
  resetLocalRepoFulfilled: (result: any) => ResetLocalRepoActions.IResetLocalRepoFulfilled;
  resetLocalRepoRejected: (result: Error) => ResetLocalRepoActions.IResetLocalRepoRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IRepoStatusDispatchers = {
  getMasterRepoStatus: GetRepoStatusActions.getMasterRepoStatusAction,
  getMasterRepoStatusFulfilled: GetRepoStatusActions.getMasterRepoStatusFulfilledAction,
  getMasterRepoStatusRejected: GetRepoStatusActions.getMasterRepoStatusRejectedAction,
  resetLocalRepo: ResetLocalRepoActions.resetLocalRepoAction,
  resetLocalRepoFulfilled: ResetLocalRepoActions.resetLocalRepoFulfilledAction,
  resetLocalRepoRejected: ResetLocalRepoActions.resetLocalRepoRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const RepoStatusActionDispatchers: IRepoStatusDispatchers = bindActionCreators<
  any,
  IRepoStatusDispatchers
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default RepoStatusActionDispatchers;
