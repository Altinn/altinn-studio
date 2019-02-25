import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IGenerateRepeatingGroupsAction extends Action {}

export interface IGenerateRepeatingGroupsActionFulfilled extends Action {}

export interface IGenerateRepeatingGroupsActionRejected extends Action {
  error: Error;
}

export function generateRepeatingGroupsAction(): IGenerateRepeatingGroupsAction {
  return {
    type: ActionTypes.GENERATE_REPEATING_GROUPS,
  };
}

export function generateRepeatingGroupsActionFulfilled(): IGenerateRepeatingGroupsActionFulfilled {
  return {
    type: ActionTypes.GENERATE_REPEATING_GROUPS_FULFILLED,
  };
}

export function generateRepeatingGroupsActionRejected(error: Error): IGenerateRepeatingGroupsActionRejected {
  return {
    type: ActionTypes.GENERATE_REPEATING_GROUPS_REJECTED,
    error,
  };
}
