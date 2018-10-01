import { Action } from 'redux';
import * as ActionTypes from '../../appDataActionTypes';

export interface ISetDesignModeAction extends Action {
  designMode: boolean;
}

export interface ISetDesignModeActionRejected extends Action {
  error: Error;
}

export function setDesignModeAction(designMode: boolean): ISetDesignModeAction {
  return {
    type: ActionTypes.SET_DESIGN_MODE,
    designMode
  };
}

export function setDesignModeActionFulfilled(): Action {
  return {
    type: ActionTypes.SET_DESIGN_MODE
  };
}

export function setDesignModeActionRejected(
  error: Error
): ISetDesignModeActionRejected {
  return {
    type: ActionTypes.SET_DESIGN_MODE,
    error
  };
}
