import { Action } from 'redux';
import { IParty } from 'altinn-shared/types';
import * as ActionTypes from './getPartiesActionTypes';

export interface IGetPartiesFulfilled extends Action {
  parties: IParty[];
}

export interface IGetPartiesRejected extends Action {
  error: Error;
}

export function getParties(): Action {
  return {
    type: ActionTypes.GET_PARTIES,
  };
}

export function getCurrentParty(): Action {
  return {
    type: ActionTypes.GET_CURRENT_PARTY,
  }
}

export function getPartiesFulfilled(parties: IParty[]): IGetPartiesFulfilled {
  return {
    type: ActionTypes.GET_PARTIES_FULFILLED,
    parties,
  };
}

export function getPartiesRejected(error: Error): IGetPartiesRejected {
  return {
    type: ActionTypes.GET_PARTIES_REJECTED,
    error,
  };
}
