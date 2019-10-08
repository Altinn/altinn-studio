import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as AppReleaseActions from './appReleaseActions';
import { IRelease } from './types';

export interface IAppReleaseActionDispatcher extends ActionCreatorsMapObject {
  fetchReleases: () => Action;
  fetchReleasesFulfilled: (releases: IRelease[]) => AppReleaseActions.IFetchReleaseActionFulfilled;
  fetchReleasesRejected: (error: Error) => AppReleaseActions.IFetchReleaseActionRejected;
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
  fetchReleases: AppReleaseActions.fetchReleases,
  fetchReleasesFulfilled: AppReleaseActions.fetchReleasesFulfilled,
  fetchReleasesRejected: AppReleaseActions.fetchReleasesRejected,
  createRelease: AppReleaseActions.createRelease,
  createReleaseFulfilled: AppReleaseActions.createReleaseFulfilled,
  createReleaseRejected: AppReleaseActions.createReleaseRejected,
};

const AppReleaseActionDispatcher: IAppReleaseActionDispatcher = bindActionCreators<
  IAppReleaseActionDispatcher,
  IAppReleaseActionDispatcher
>(actions, store.dispatch);

export default AppReleaseActionDispatcher;
