import { Action } from 'redux';
import * as ActionTypes from '../rulesActionTypes';
import { IRuleModelFieldElement } from '..';

export interface IFetchRuleModelFulfilled extends Action {
  ruleModel: IRuleModelFieldElement[];
}

export interface IFetchRuleModelRejected extends Action {
  error: Error;
}

export function fetchRuleModelAction(): Action {
  return {
    type: ActionTypes.FETCH_RULE_MODEL,
  };
}

export function fetchRuleModelFulfilledAction(
  ruleModel: IRuleModelFieldElement[],
): IFetchRuleModelFulfilled {
  return {
    type: ActionTypes.FETCH_RULE_MODEL_FULFILLED,
    ruleModel,
  };
}

export function fetchRuleModelRejectedAction(
  error: Error,
): IFetchRuleModelRejected {
  return {
    type: ActionTypes.FETCH_RULE_MODEL_REJECTED,
    error,
  };
}
