import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IParty } from 'altinn-shared/types';
import { IGetPartiesFulfilled, IGetPartiesRejected } from './getParties/getPartiesActions';
import * as GetPartyActionTypes from './getParties/getPartiesActionTypes';
import { ISelectPartyFulfilled, ISelectPartyRejected } from './selectParty/selectPartyActions';
import * as SelectPartyActionTypes from './selectParty/selectPartyActionTypes';

export interface IPartyState {
  parties: IParty[];
  selectedParty: IParty;
  error: Error;
}

const initialState: IPartyState = {
  parties: null,
  selectedParty: null,
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
    case GetPartyActionTypes.GET_PARTIES_FULFILLED: {
      const { parties } = action as IGetPartiesFulfilled;
      return update<IPartyState>(state, {
        parties: {
          $set: parties,
        },
      });
    }
    case GetPartyActionTypes.GET_PARTIES_REJECTED: {
      const { error } = action as IGetPartiesRejected;
      return update<IPartyState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case SelectPartyActionTypes.SELECT_PARTY_FULFILLED: {
      const { party } = action as ISelectPartyFulfilled;
      return update<IPartyState>(state, {
        selectedParty: {
          $set: party,
        },
      });
    }
    case SelectPartyActionTypes.SELECT_PARTY_REJECTED: {
      const { error } = action as ISelectPartyRejected;
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
