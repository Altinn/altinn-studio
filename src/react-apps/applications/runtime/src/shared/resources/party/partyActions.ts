import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';
import { IParty } from './';
import * as GetPartiesActions from './getParties/getPartiesActions';

export interface IPartyActions extends ActionCreatorsMapObject {
  getParties: (url: string) => GetPartiesActions.IGetParties;
  getPartiesFulfilled: (parties: IParty[]) => GetPartiesActions.IGetPartiesFulfilled;
  getPartiesRejected: (error: Error) => GetPartiesActions.IGetPartiesRejected;
}

const actions: IPartyActions = {
  getParties: GetPartiesActions.getParties,
  getPartiesFulfilled: GetPartiesActions.getPartiesFulfilled,
  getPartiesRejected: GetPartiesActions.getPartiesRejected,
};

const PartyActions: IPartyActions = bindActionCreators(actions, store.dispatch);

export default PartyActions;
