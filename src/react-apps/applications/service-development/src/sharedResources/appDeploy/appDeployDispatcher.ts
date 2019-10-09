import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as CreateAppDeploymentActions from './create/createAppDeploymentActions';
import * as GetAppDeploymentActions from './get/getAppDeploymentActions';
import { IDeployment } from './types';

export interface IAppReleaseActionDispatcher extends ActionCreatorsMapObject {
  getDeployments: () => Action;
  getDeploymentsFulfilled: (releases: IDeployment[]) => GetAppDeploymentActions.IGetDeploymentsFulfilled;
  getDeploymentsRejected: (error: Error) => GetAppDeploymentActions.IGetDeploymentsRejected;
  createDeployment: (tagName: string, envName: string) => CreateAppDeploymentActions.ICreateDeployment;
  createDeploymentFulfilled: (id: string) => CreateAppDeploymentActions.ICreateDeploymentFulfilled;
  createDeploymentRejected: (error: Error) => CreateAppDeploymentActions.ICreateDeploymentRejected;
}

const actions: IAppReleaseActionDispatcher = {
  getDeployments: GetAppDeploymentActions.getDeployments,
  getDeploymentsFulfilled: GetAppDeploymentActions.getDeploymentsFulfilled,
  getDeploymentsRejected: GetAppDeploymentActions.getDeploymentsRejected,
  createDeployment: CreateAppDeploymentActions.createDeployment,
  createDeploymentFulfilled: CreateAppDeploymentActions.createDeploymentFulfilled,
  createDeploymentRejected: CreateAppDeploymentActions.createDeploymentRejected,
};

const AppReleaseActionDispatcher: IAppReleaseActionDispatcher = bindActionCreators<
  IAppReleaseActionDispatcher,
  IAppReleaseActionDispatcher
>(actions, store.dispatch);

export default AppReleaseActionDispatcher;
