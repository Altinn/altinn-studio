import { Action } from 'redux';
import * as ActionTypes from '../../errorActionTypes';

export interface IRemoveErrorAction extends Action {
  errorIndex: number;
}

export function removeErrorMessage(errorIndex: number): IRemoveErrorAction {
  return {
    type: ActionTypes.REMOVE_ERROR,
    errorIndex,
  };
}