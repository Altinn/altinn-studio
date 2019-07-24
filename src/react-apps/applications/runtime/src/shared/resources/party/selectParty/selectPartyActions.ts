import { Action } from 'redux';
import { IParty } from '../.';
import * as ActionTypes from './selectPartyActionTypes';

export interface ISelectParty extends Action {
  party: IParty;
}

export interface ISelectPartyFulfilled extends Action {
  party: IParty;
}

export interface ISelectPartyRejected extends Action {
  error: Error;
}

export function selectParty(party: IParty): ISelectParty {
  return {
    type: ActionTypes.SELECT_PARTY,
    party,
  };
}

export function selectPartyFulfilled(party: IParty): ISelectPartyFulfilled {
  return {
    type: ActionTypes.SELECT_PARTY_FULFILLED,
    party,
  };
}

export function selectPartyRejected(error: Error): ISelectPartyRejected {
  return {
    type: ActionTypes.SELECT_PARTY_REJECTED,
    error,
  };
}
