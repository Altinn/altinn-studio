/* tslint:disable:max-line-length */
import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as AppClusterActions from './getDeployments/getDeploymentsInAppClusterActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IAppClusterDispatcher extends ActionCreatorsMapObject {
  getDeployments: (env: string, org: string, repo: string) => AppClusterActions.IGetDeployments;
  getDeploymentsFulfilled: (result: any, env: string) => AppClusterActions.IGetDeploymentsFulfilled;
  getDeploymentsRejected: (result: Error, env: string) => AppClusterActions.IGetDeploymentsRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IAppClusterDispatcher = {
  getDeployments: AppClusterActions.getDeploymentsAction,
  getDeploymentsFulfilled: AppClusterActions.getDeploymentsFulfilledAction,
  getDeploymentsRejected: AppClusterActions.getDeploymentsRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const AppClusterDispatchers: IAppClusterDispatcher = bindActionCreators<
  any,
  IAppClusterDispatcher
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default AppClusterDispatchers;
