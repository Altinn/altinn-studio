import { Action } from 'redux';
import * as ActionTypes from '../../navigationActionTypes';

export interface IToggleDrawerActionRejected extends Action {
  error: Error;
}

export function toggleDrawerAction(): Action {
  return {
    type: ActionTypes.TOGGLE_DRAWER,
  };
}

export function toggleDrawerActionRejected(
  error: Error,
): IToggleDrawerActionRejected {
  return {
    type: ActionTypes.TOGGLE_DRAWER,
    error,
  };
}
