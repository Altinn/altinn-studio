import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as DeployActions from './deployActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IDeployDispatchers extends ActionCreatorsMapObject {
  fetchDeployments: (env: string, org: string, repo: string) => DeployActions.IFetchDeploymentsAction;
  fetchDeploymentsFulfilled: (result: any, env: string) => DeployActions.IFetchDeploymentsFulfilled;
  fetchDeploymentsRejected: (result: Error) => DeployActions.IFetchDeploymentsRejected;
  fetchMasterRepoStatus: (url: string, org: string, repo: string) => DeployActions.IFetchMasterRepoStatusAction;
  fetchMasterRepoStatusFulfilled: (result: any) => DeployActions.IFetchMasterRepoStatusFulfilled;
  fetchMasterRepoStatusRejected: (result: Error) => DeployActions.IFetchMasterRepoStatusRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IDeployDispatchers = {
  fetchDeployments: DeployActions.fetchDeploymentsAction,
  fetchDeploymentsFulfilled: DeployActions.fetchDeploymentsFulfilledAction,
  fetchDeploymentsRejected: DeployActions.fetchDeploymentsRejectedAction,
  fetchMasterRepoStatus: DeployActions.fetchMasterRepoStatusAction,
  fetchMasterRepoStatusFulfilled: DeployActions.fetchMasterRepoStatusFulfilledAction,
  fetchMasterRepoStatusRejected: DeployActions.fetchMasterRepoStatusRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const DeployActionDispatchers: IDeployDispatchers = bindActionCreators<
  any,
  IDeployDispatchers
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default DeployActionDispatchers;
