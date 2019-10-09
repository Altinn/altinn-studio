import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as AppDeploymentActions from './appDeployActions';
import { IDeployment } from './types';

export interface IAppReleaseActionDispatcher extends ActionCreatorsMapObject {
  getDeployments: () => Action;
  getDeploymentsFulfilled: (releases: IDeployment[]) => AppDeploymentActions.IGetDeploymentsFulfilled;
  getDeploymentsRejected: (error: Error) => AppDeploymentActions.IGetDeploymentsRejected;
  createDeployment: (tagName: string, envName: string) => AppDeploymentActions.ICreateDeployment;
  createDeploymentFulfilled: (id: string) => AppDeploymentActions.ICreateDeploymentFulfilled;
  createDeploymentRejected: (error: Error) => AppDeploymentActions.ICreateDeploymentRejected;
}

const actions: IAppReleaseActionDispatcher = {
  getDeployments: AppDeploymentActions.getDeployments,
  getDeploymentsFulfilled: AppDeploymentActions.getDeploymentsFulfilled,
  getDeploymentsRejected: AppDeploymentActions.getDeploymentsRejected,
  createDeployment: AppDeploymentActions.createRelease,
  createDeploymentFulfilled: AppDeploymentActions.createReleaseFulfilled,
  createDeploymentRejected: AppDeploymentActions.createReleaseRejected,
};

const AppReleaseActionDispatcher: IAppReleaseActionDispatcher = bindActionCreators<
  IAppReleaseActionDispatcher,
  IAppReleaseActionDispatcher
>(actions, store.dispatch);

export default AppReleaseActionDispatcher;
