import { Action } from 'redux';
import * as ActionTypes from '../../navigationActionTypes';

export function toggleDrawerAction(): Action {
  return {
    type: ActionTypes.TOGGLE_DRAWER,
  };
}
