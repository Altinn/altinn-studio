/* tslint:disable:max-line-length */
import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as RepoStatusActions from './get/getMasterRepoStatusActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IRepoStatusDispatchers extends ActionCreatorsMapObject {
  getMasterRepoStatus: (org: string, repo: string) => RepoStatusActions.IGetMasterRepoStatus;
  getMasterRepoStatusFulfilled: (result: any) => RepoStatusActions.IGetMasterRepoStatusFulfilled;
  getMasterRepoStatusRejected: (result: Error) => RepoStatusActions.IGetMasterRepoStatusRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IRepoStatusDispatchers = {
  getMasterRepoStatus: RepoStatusActions.getMasterRepoStatusAction,
  getMasterRepoStatusFulfilled: RepoStatusActions.getMasterRepoStatusFulfilledAction,
  getMasterRepoStatusRejected: RepoStatusActions.getMasterRepoStatusRejectedAction,
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
