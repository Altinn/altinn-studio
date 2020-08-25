import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IParty } from 'altinn-shared/types';
import { store } from '../../redux/store';
import * as GetPartiesActions from './getParties/getPartiesActions';
import * as SelectPartyActions from './selectParty/selectPartyActions';

export interface IPartyActions extends ActionCreatorsMapObject {
  getParties: () => Action;
  getPartiesFulfilled: (parties: IParty[]) => GetPartiesActions.IGetPartiesFulfilled;
  getPartiesRejected: (error: Error) => GetPartiesActions.IGetPartiesRejected;
  getCurrentParty: () => Action;
  selectParty: (party: IParty, redirect: boolean) => SelectPartyActions.ISelectParty;
  selectPartyFulfilled: (party: IParty) => SelectPartyActions.ISelectPartyFulfilled;
  selectPartyRejected: (error: Error) => SelectPartyActions.ISelectPartyRejected;
}

const actions: IPartyActions = {
  getParties: GetPartiesActions.getParties,
  getPartiesFulfilled: GetPartiesActions.getPartiesFulfilled,
  getPartiesRejected: GetPartiesActions.getPartiesRejected,
  getCurrentParty: GetPartiesActions.getCurrentParty,
  selectParty: SelectPartyActions.selectParty,
  selectPartyFulfilled: SelectPartyActions.selectPartyFulfilled,
  selectPartyRejected: SelectPartyActions.selectPartyRejected,
};

const PartyActions: IPartyActions = bindActionCreators(actions, store.dispatch);

export default PartyActions;
