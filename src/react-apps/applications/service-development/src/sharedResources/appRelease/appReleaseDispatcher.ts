import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as CreateAppReleaseActions from './create/createAppReleaseActions';
import * as GetAppReleaseActions from './get/getAppReleasesActions';
import { IRelease } from './types';

export interface IAppReleaseActionDispatcher extends ActionCreatorsMapObject {
  getAppReleases: () => Action;
  getAppReleasesFulfilled: (releases: IRelease[]) => GetAppReleaseActions.IGetReleaseActionFulfilled;
  getAppReleasesRejected: (errorCode: number) => GetAppReleaseActions.IGetReleaseActionRejected;
  getAppReleasesIntervalStart: () => Action;
  getAppReleasesIntervalStop: () => Action;
  createAppRelease: (
    tagName: string,
    name: string,
    body: string,
    targetCommitish: string,
  ) => CreateAppReleaseActions.ICreateReleaseAction;
  createAppReleaseFulfilled: (release: IRelease) => CreateAppReleaseActions.ICreateReleaseFulfilledAction;
  createAppReleaseRejected: (errorCode: number) => CreateAppReleaseActions.ICreateReleaseRejectedActions;
}

const actions: IAppReleaseActionDispatcher = {
  getAppReleases: GetAppReleaseActions.getAppReleases,
  getAppReleasesFulfilled: GetAppReleaseActions.getAppReleasesFulfilled,
  getAppReleasesRejected: GetAppReleaseActions.getAppReleasesRejected,
  getAppReleasesIntervalStart: GetAppReleaseActions.startGetAppReleasesInterval,
  getAppReleasesIntervalStop: GetAppReleaseActions.stopGetAppReleasesInterval,
  createAppRelease: CreateAppReleaseActions.createAppRelease,
  createAppReleaseFulfilled: CreateAppReleaseActions.createAppReleaseFulfilled,
  createAppReleaseRejected: CreateAppReleaseActions.createAppReleaseRejected,
};

const AppReleaseActionDispatcher: IAppReleaseActionDispatcher = bindActionCreators<
  IAppReleaseActionDispatcher,
  IAppReleaseActionDispatcher
>(actions, store.dispatch);

export default AppReleaseActionDispatcher;
