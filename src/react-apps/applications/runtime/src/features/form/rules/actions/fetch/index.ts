import { Action } from 'redux';
import { IRuleModelFieldElement } from '../../types';
import * as ActionTypes from '../types';

export interface IFetchRuleModel extends Action {
  url: string;
}

export interface IFetchRuleModelFulfilled extends Action {
  ruleModel: IRuleModelFieldElement[];
}

export interface IFetchRuleModelRejected extends Action {
  error: Error;
}

export function fetchRuleModelAction(url: string): IFetchRuleModel {
  return {
    type: ActionTypes.FETCH_RULE_MODEL,
    url,
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
