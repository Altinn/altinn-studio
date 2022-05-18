import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as Fetchorgs from './fetch/fetchOrgsActions';

export type IOrgsActions = typeof actions;

const actions = {
  fetchOrgs: Fetchorgs.fetchOrgs,
  fetchOrgsFulfilled: Fetchorgs.fetchOrgsFulfilled,
  fetchOrgsRejected: Fetchorgs.fetchOrgsRejected,
};

const OrgActions: IOrgsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default OrgActions;
