import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface ISelectLayoutElementAction extends Action {
  id: string;
}

export interface ISelectLayoutElementActionRejected extends Action {
  error: Error;
}

export function selectLayoutElementAction(id: string): ISelectLayoutElementAction {
  return {
    type: ActionTypes.SELECT_FORM_COMPONENT,
    id,
  };
}

export function selectLayoutElementActionFulfilled(): Action {
  return {
    type: ActionTypes.SELECT_FORM_COMPONENT_FULFILLED,
  };
}

export function selectLayoutElementActionRejected(error: Error): ISelectLayoutElementActionRejected {
  return {
    type: ActionTypes.SELECT_FORM_COMPONENT_REJECTED,
    error,
  };
}
