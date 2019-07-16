import { Action } from 'redux';
import { IParty } from '..';
import * as ActionTypes from './getPartiesActionTypes';

export interface IGetParties extends Action {
  url: string;
}

export interface IGetPartiesFulfilled extends Action {
  parties: IParty[];
}

export interface IGetPartiesRejected extends Action {
  error: Error;
}

export function getParties(url: string): IGetParties {
  return {
    type: ActionTypes.GET_PARTIES,
    url,
  };
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
