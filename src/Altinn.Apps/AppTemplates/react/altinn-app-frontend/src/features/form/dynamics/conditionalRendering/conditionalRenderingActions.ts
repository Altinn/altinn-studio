import { Action } from 'redux';
import * as ActionTypes from '../formDynamicsActionTypes';

export interface ICheckIfConditionalRulesShouldRun extends Action {
  repeatingContainerId?: string;
}

export function checkIfConditionalRulesShouldRun(repeatingContainerId?: string): ICheckIfConditionalRulesShouldRun {
  return {
    type: ActionTypes.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN,
    repeatingContainerId,
  };
}
