import { Action } from 'redux';
import * as ActionTypes from '../processActionTypes';

export function CheckProcessUpdated(): Action {
  return {
    type: ActionTypes.CHECK_PROCESS_UPDATED,
  };
}
