/* tslint:disable:max-line-length */
import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as DeployActions from './deployActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IDeployDispatchers extends ActionCreatorsMapObject {
  fetchDeployments: (env: string, org: string, repo: string) => DeployActions.IFetchDeployments;
  fetchDeploymentsFulfilled: (result: any, env: string) => DeployActions.IFetchDeploymentsFulfilled;
  fetchDeploymentsRejected: (result: Error, env: string) => DeployActions.IFetchDeploymentsRejected;
  fetchMasterRepoStatus: (org: string, repo: string) => DeployActions.IFetchMasterRepoStatus;
  fetchMasterRepoStatusFulfilled: (result: any) => DeployActions.IFetchMasterRepoStatusFulfilled;
  fetchMasterRepoStatusRejected: (result: Error) => DeployActions.IFetchMasterRepoStatusRejected;
  deployAltinnApp: (env: string, org: string, repo: string) => DeployActions.IDeployAltinnApp;
  deployAltinnAppFulfilled: (result: any, env: string) => DeployActions.IDeployAltinnAppFulfilled;
  deployAltinnAppRejected: (result: Error, env: string) => DeployActions.IDeployAltinnAppRejected;
  fetchDeployAltinnAppStatus: (env: string, org: string, repo: string, buildId: string) => DeployActions.IFetchDeployAltinnAppStatus;
  fetchDeployAltinnAppStatusFulfilled: (result: any, env: string) => DeployActions.IFetchDeployAltinnAppStatusFulfilled;
  fetchDeployAltinnAppStatusRejected: (result: Error, env: string) => DeployActions.IFetchDeployAltinnAppStatusRejected;
  resetDeploymentStatus: (env: string) => DeployActions.IResetDeploymentStatus;
  fetchCompileStatus: (org: string, repo: string) => DeployActions.IFetchCompileStatus;
  fetchCompileStatusFulfilled: (result: any) => DeployActions.IFetchCompileStatusFulfilled;
  fetchCompileStatusRejected: (result: Error) => DeployActions.IFetchCompileStatusRejected;
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
  deployAltinnApp: DeployActions.deployAltinnAppAction,
  deployAltinnAppFulfilled: DeployActions.deployAltinnAppFulfilledAction,
  deployAltinnAppRejected: DeployActions.deployAltinnAppRejectedAction,
  fetchDeployAltinnAppStatus: DeployActions.fetchDeployAltinnAppStatusAction,
  fetchDeployAltinnAppStatusFulfilled: DeployActions.fetchDeployAltinnAppStatusFulfilledAction,
  fetchDeployAltinnAppStatusRejected: DeployActions.fetchDeployAltinnAppStatusRejectedAction,
  resetDeploymentStatus: DeployActions.resetDeploymentStatusAction,
  fetchCompileStatus: DeployActions.fetchCompileStatusAction,
  fetchCompileStatusFulfilled: DeployActions.fetchCompileStatusFulfilledAction,
  fetchCompileStatusRejected: DeployActions.fetchCompileStatusRejectedAction,
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
