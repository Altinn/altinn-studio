import { IAltinnOrgs } from 'altinn-shared/types';
import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IFetchOrgsFulfilled, IFetchOrgsRejected } from './fetch/fetchOrgsActions';
import * as OrgsActionTypes from './fetch/fetchOrgsActionTypes';

export interface IOrgsState {
  allOrgs: IAltinnOrgs;
  error: Error;
}

const initialState: IOrgsState = {
  allOrgs: null,
  error: null,
};

const orgsReducer: Reducer<IOrgsState> = (state: IOrgsState = initialState, action?: Action): IOrgsState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case OrgsActionTypes.FETCH_ORGS_FULFILLED: {
      const { orgs } = action as IFetchOrgsFulfilled;
      return update<IOrgsState>(state, {
        allOrgs: {
          $set: orgs,
        },
      });
    }
    case OrgsActionTypes.FETCH_ORGS_REJECTED: {
      const { error } = action as IFetchOrgsRejected;
      return update<IOrgsState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: { return state; }
  }
};

export default orgsReducer;
