import { Action } from 'redux';
import * as ActionTypes from '../types';

export interface ICheckIfRuleShouldRun extends Action {
  lastUpdatedComponentId: string;
  lastUpdatedDataField: string;
  lastUpdatedData: string;
  repeatingContainerId?: string;
}

export function checkIfRuleShouldRun(
  lastUpdatedComponentId: string,
  lastUpdatedDataField: string,
  lastUpdatedData: string,
  repeatingContainerId?: string,
): ICheckIfRuleShouldRun {
  return {
    type: ActionTypes.CHECK_IF_RULE_SHOULD_RUN,
    lastUpdatedComponentId,
    lastUpdatedDataField,
    lastUpdatedData,
    repeatingContainerId,
  };
}
