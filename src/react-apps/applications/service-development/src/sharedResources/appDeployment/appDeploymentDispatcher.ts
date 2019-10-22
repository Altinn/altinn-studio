import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as CreateAppDeploymentActions from './create/createAppDeploymentActions';
import * as GetAppDeploymentsActions from './get/getAppDeploymentActions';
import { IDeployment, IDeploymentResults } from './types';

export interface IAppDeploymenActionDispatcher extends ActionCreatorsMapObject {
  getAppDeployments: () => Action;
  getAppDeploymentsFulfilled: (deployments: IDeploymentResults) => GetAppDeploymentsActions.IGetAppDeploymentsFulfilled;
  getAppDeploymentsRejected: (error: Error) => GetAppDeploymentsActions.IGetAppDeploymentsRejected;
  getAppDeploymentsStartInterval: () => Action;
  getAppDeploymentsStopInterval: () => Action;
  createAppDeployment: (tagName: string, envObj: CreateAppDeploymentActions.ICreateAppDeploymentEnvObject) =>
    CreateAppDeploymentActions.ICreateAppDeployment;
  createAppDeploymentFulfilled: (result: IDeployment, envName: string) =>
    CreateAppDeploymentActions.ICreateAppDeploymentFulfilled;
  createAppDeploymentRejected: (error: Error, envName: string) =>
    CreateAppDeploymentActions.ICreateAppDeploymentRejected;
}

const actions: IAppDeploymenActionDispatcher = {
  getAppDeployments: GetAppDeploymentsActions.getAppDeployments,
  getAppDeploymentsFulfilled: GetAppDeploymentsActions.getAppDeploymentsFulfilled,
  getAppDeploymentsRejected: GetAppDeploymentsActions.getAppDeploymentsRejected,
  getAppDeploymentsStartInterval: GetAppDeploymentsActions.getAppDeploymentsStartInterval,
  getAppDeploymentsStopInterval: GetAppDeploymentsActions.getAppDeploymentsStopInterval,
  createAppDeployment: CreateAppDeploymentActions.createAppDeployment,
  createAppDeploymentFulfilled: CreateAppDeploymentActions.createAppDeploymentFulfilled,
  createAppDeploymentRejected: CreateAppDeploymentActions.createAppDeploymentRejected,
};

const AppDeploymenActionDispatcher: IAppDeploymenActionDispatcher = bindActionCreators<
  IAppDeploymenActionDispatcher,
  IAppDeploymenActionDispatcher
>(actions, store.dispatch);

export default AppDeploymenActionDispatcher;
