import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as AppReleaseActions from './appReleaseActions';
import { IRelease } from './types';

export interface IAppReleaseActionDispatcher extends ActionCreatorsMapObject {
  getReleases: () => Action;
  getReleasesFulfilled: (releases: IRelease[]) => AppReleaseActions.IGetReleaseActionFulfilled;
  getReleasesRejected: (error: Error) => AppReleaseActions.IGetReleaseActionRejected;
  createRelease: (
    tagName: string,
    name: string,
    body: string,
    targetCommitish: string,
  ) => AppReleaseActions.ICreateReleaseAction;
  createReleaseFulfilled: (id: string) => AppReleaseActions.ICreateReleaseFulfilledAction;
  createReleaseRejected: (error: Error) => AppReleaseActions.ICreateReleaseRejectedActions;
}

const actions: IAppReleaseActionDispatcher = {
  getReleases: AppReleaseActions.getReleases,
  getReleasesFulfilled: AppReleaseActions.getReleasesFulfilled,
  getReleasesRejected: AppReleaseActions.getReleasesRejected,
  createRelease: AppReleaseActions.createRelease,
  createReleaseFulfilled: AppReleaseActions.createReleaseFulfilled,
  createReleaseRejected: AppReleaseActions.createReleaseRejected,
};

const AppReleaseActionDispatcher: IAppReleaseActionDispatcher = bindActionCreators<
  IAppReleaseActionDispatcher,
  IAppReleaseActionDispatcher
>(actions, store.dispatch);

export default AppReleaseActionDispatcher;
