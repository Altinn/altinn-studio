import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface IRuleModelState {
  model: IRuleModelFieldElement[];
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: IRuleModelState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

const ruleModelReducer: Reducer<IRuleModelState> = (
  state: IRuleModelState = initialState,
  action?: Action,
): IRuleModelState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case AppDataActionTypes.FETCH_RULE_MODEL: {
      return update<IRuleModelState>(state, {
        fetched: {
          $set: false,
        },
        fetching: {
          $set: true,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppDataActionTypes.FETCH_RULE_MODEL_FULFILLED: {
      const { ruleModel } = action as AppDataActions.IFetchRuleModelFulfilled;
      return update<IRuleModelState>(state, {
        model: {
          $set: ruleModel,
        },
        fetched: {
          $set: true,
        },
        fetching: {
          $set: false,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppDataActionTypes.FETCH_RULE_MODEL_REJECTED: {
      const { error } = action as AppDataActions.IFetchRuleModelRejected;
      return update<IRuleModelState>(state, {
        error: {
          $set: error,
        },
        fetched: {
          $set: false,
        },
        fetching: {
          $set: false,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default ruleModelReducer;
