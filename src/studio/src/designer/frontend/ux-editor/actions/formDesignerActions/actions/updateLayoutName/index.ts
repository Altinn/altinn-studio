import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateLayoutNameAction extends Action {
  oldName: string;
  newName: string;
}

export interface IUpdateLayoutNameFulfilledAction extends Action {
  oldName: string;
  newName: string;

}

export interface IUpdateLayoutNameRejectedAction extends Action {
  error: Error;
}

export function updateLayoutName(oldName: string, newName: string): IUpdateLayoutNameAction {
  return {
    type: ActionTypes.UPDATE_LAYOUT_NAME,
    oldName,
    newName,
  };
}

export function updateLayoutNameFulfilled(oldName: string, newName: string):
  IUpdateLayoutNameFulfilledAction {
  return {
    type: ActionTypes.UPDATE_LAYOUT_NAME_FULFILLED,
    oldName,
    newName,
  };
}

export function updateLayoutNameRejected(error: Error): IUpdateLayoutNameRejectedAction {
  return {
    type: ActionTypes.UPDATE_LAYOUT_NAME_REJECTED,
    error,
  };
}
