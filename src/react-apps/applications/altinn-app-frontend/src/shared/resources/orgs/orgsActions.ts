import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as Fetchorgs from './fetch/fetchOrgsActions';

export interface IOrgsActions extends ActionCreatorsMapObject {
  fetchOrgs: () => Fetchorgs.IFetchOrgs;
  fetchOrgsFulfilled: ( orgs: any ) => Fetchorgs.IFetchOrgsFulfilled;
  fetchOrgsRejected: ( error: Error) => Fetchorgs.IFetchOrgsRejected;
}

const actions: IOrgsActions = {
  fetchOrgs: Fetchorgs.fetchOrgs,
  fetchOrgsFulfilled: Fetchorgs.fetchOrgsFulfilled,
  fetchOrgsRejected: Fetchorgs.fetchOrgsRejected,
};

const OrgActions: IOrgsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default OrgActions;
