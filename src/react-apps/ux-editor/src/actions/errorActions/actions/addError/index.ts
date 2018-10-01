import { Action } from 'redux';
import * as ActionTypes from '../../errorActionTypes';

export interface IAddErrorAction extends Action {
  errorMessage: string;
}

export function addErrorMessage(errorMessage: string): IAddErrorAction {
  return {
    type: ActionTypes.ADD_ERROR,
    errorMessage,
  };
}