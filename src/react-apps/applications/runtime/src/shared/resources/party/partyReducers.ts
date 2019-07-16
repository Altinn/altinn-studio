import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IParty } from './';
import { IGetPartiesFulfilled, IGetPartiesRejected } from './getParties/getPartiesActions';
import * as PartyActionTypes from './getParties/getPartiesActionTypes';

export interface IPartyState {
  parties: IParty[];
  error: Error;
}

const initialState: IPartyState = {
  parties: null,
  error: null,
};

const partyReducer: Reducer<IPartyState> = (
  state: IPartyState = initialState,
  action?: Action,
): IPartyState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case PartyActionTypes.GET_PARTIES_FULFILLED: {
      const { parties } = action as IGetPartiesFulfilled;
      return update<IPartyState>(state, {
        parties: {
          $set: parties,
        },
      });
    }
    case PartyActionTypes.GET_PARTIES_REJECTED: {
      const { error } = action as IGetPartiesRejected;
      return update<IPartyState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: { return state; }
  }
};

export default partyReducer;

