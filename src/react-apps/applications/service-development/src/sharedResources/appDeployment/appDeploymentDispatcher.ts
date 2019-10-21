import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as CreateAppDeploymentActions from './create/createAppDeploymentActions';
import * as GetAppDeploymentsActions from './get/getAppDeploymentActions';
import { IDeployment } from './types';

export interface IAppReleaseActionDispatcher extends ActionCreatorsMapObject {
  getAppDeployments: () => Action;
  getAppDeploymentsFulfilled: (releases: IDeployment[]) => GetAppDeploymentsActions.IGetAppDeploymentsFulfilled;
  getAppDeploymentsRejected: (error: Error) => GetAppDeploymentsActions.IGetAppDeploymentsRejected;
  createAppDeployment: (tagName: string, envName: string) => CreateAppDeploymentActions.ICreateDeployment;
  createAppDeploymentFulfilled: (id: string) => CreateAppDeploymentActions.ICreateDeploymentFulfilled;
  createAppDeploymentRejected: (error: Error) => CreateAppDeploymentActions.ICreateDeploymentRejected;
}

const actions: IAppReleaseActionDispatcher = {
  getAppDeployments: GetAppDeploymentsActions.getAppDeployments,
  getAppDeploymentsFulfilled: GetAppDeploymentsActions.getAppDeploymentsFulfilled,
  getAppDeploymentsRejected: GetAppDeploymentsActions.getAppDeploymentsRejected,
  createAppDeployment: CreateAppDeploymentActions.createDeployment,
  createAppDeploymentFulfilled: CreateAppDeploymentActions.createDeploymentFulfilled,
  createAppDeploymentRejected: CreateAppDeploymentActions.createDeploymentRejected,
};

const AppReleaseActionDispatcher: IAppReleaseActionDispatcher = bindActionCreators<
  IAppReleaseActionDispatcher,
  IAppReleaseActionDispatcher
>(actions, store.dispatch);

export default AppReleaseActionDispatcher;
