import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IRuleModelFieldElement } from '../';
import * as FetchActions from '../actions/fetch';
import * as ActionTypes from '../actions/types';

export interface IFormRuleState {
  model: IRuleModelFieldElement[];
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: IFormRuleState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

const ruleModelReducer: Reducer<IFormRuleState> = (
  state: IFormRuleState = initialState,
  action?: Action,
): IFormRuleState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_RULE_MODEL: {
      return update<IFormRuleState>(state, {
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
    case ActionTypes.FETCH_RULE_MODEL_FULFILLED: {
      const { ruleModel } = action as FetchActions.IFetchRuleModelFulfilled;
      return update<IFormRuleState>(state, {
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
    case ActionTypes.FETCH_RULE_MODEL_REJECTED: {
      const { error } = action as FetchActions.IFetchRuleModelRejected;
      return update<IFormRuleState>(state, {
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
