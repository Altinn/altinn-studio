import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as FetchOrgs from './fetch/fetchOrgsActions';

export type IOrgsActions = typeof actions;

const actions = {
  fetchOrgs: FetchOrgs.fetchOrgs,
  fetchOrgsFulfilled: FetchOrgs.fetchOrgsFulfilled,
  fetchOrgsRejected: FetchOrgs.fetchOrgsRejected,
};

const OrgActions: IOrgsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default OrgActions;
