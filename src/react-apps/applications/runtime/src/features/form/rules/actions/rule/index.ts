import { Action } from 'redux';
import { IDataModelFieldElement } from '../../';
import * as ActionTypes from '../types';

export interface ICheckIfRuleShouldRun extends Action {
  lastUpdatedComponentId: string;
  lastUpdatedDataBinding: IDataModelFieldElement;
  lastUpdatedDataValue: string;
  repeatingContainerId?: string;
}

export function checkIfRuleShouldRun(
  lastUpdatedComponentId: string,
  lastUpdatedDataBinding: IDataModelFieldElement,
  lastUpdatedDataValue: string,
  repeatingContainerId?: string,
): ICheckIfRuleShouldRun {
  console.log('action is running ', lastUpdatedComponentId, lastUpdatedDataBinding, lastUpdatedDataValue);
  return {
    type: ActionTypes.CHECK_IF_RULE_SHOULD_RUN,
    lastUpdatedComponentId,
    lastUpdatedDataBinding,
    lastUpdatedDataValue,
    repeatingContainerId,
  };
}
