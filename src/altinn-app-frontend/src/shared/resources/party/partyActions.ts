import { bindActionCreators } from "redux";
import { store } from "src/store";
import * as GetPartiesActions from "./getParties/getPartiesActions";
import * as SelectPartyActions from "./selectParty/selectPartyActions";

export type IPartyActions = typeof actions;

const actions = {
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
