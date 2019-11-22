import { Action } from 'redux';
import { IParty } from '../../../../../../shared/src/types';
import * as ActionTypes from './selectPartyActionTypes';

export interface ISelectParty extends Action {
  party: IParty;
  redirect: boolean;
}

export interface ISelectPartyFulfilled extends Action {
  party: IParty;
}

export interface ISelectPartyRejected extends Action {
  error: Error;
}

export function selectParty(party: IParty, redirect: boolean): ISelectParty {
  return {
    type: ActionTypes.SELECT_PARTY,
    party,
    redirect,
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
