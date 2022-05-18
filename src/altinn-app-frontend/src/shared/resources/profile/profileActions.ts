import { bindActionCreators } from 'redux';
import { store } from 'src/store';
import * as FetchProfileActions from './fetch/fetchProfileActions';

export type IProfileActions = typeof actions;

const actions = {
  fetchProfile: FetchProfileActions.fetchProfile,
  fetchProfileFulfilled: FetchProfileActions.fetchProfileFulfilled,
  fetchProfileRejected: FetchProfileActions.fetchProfileRejected,
};

const ProfileActions: IProfileActions = bindActionCreators(actions, store.dispatch);

export default ProfileActions;
