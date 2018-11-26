import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface ICreateRepeatingGroupAction extends Action {
  id: string;
}

export interface ICreateRepeatingGroupRejected extends Action {
  error: Error;
}

export function createRepeatingGroupAction(id: string): ICreateRepeatingGroupAction {
  return {
    type: ActionTypes.CREATE_REPEATING_GROUP,
    id,
  };
}

export function createRepeatingGroupFulfilled(): Action {
  return {
    type: ActionTypes.CREATE_REPEATING_GORUP_FULFILLED,
  };
}

export function createRepeatingGroupRejected(error: Error): ICreateRepeatingGroupRejected {
  return {
    type: ActionTypes.CREATE_REPEATING_GORUP_REJECTED,
    error,
  };
}
