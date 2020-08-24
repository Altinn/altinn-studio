import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';
import { IProfile } from 'altinn-shared/types';
import * as FetchProfileActions from './fetch/fetchProfileActions';

export interface IProfileActions extends ActionCreatorsMapObject {
  fetchProfile: (url: string) => FetchProfileActions.IFetchProfile;
  fetchProfileFulfilled: (
    profile: IProfile,
  ) => FetchProfileActions.IFetchProfileFulfilled;
  fetchProfileRejected: (error: Error) => FetchProfileActions.IFetchProfileRejected;
}

const actions: IProfileActions = {
  fetchProfile: FetchProfileActions.fetchProfile,
  fetchProfileFulfilled: FetchProfileActions.fetchProfileFulfilled,
  fetchProfileRejected: FetchProfileActions.fetchProfileRejected,
};

const ProfileActions: IProfileActions = bindActionCreators(actions, store.dispatch);

export default ProfileActions;
