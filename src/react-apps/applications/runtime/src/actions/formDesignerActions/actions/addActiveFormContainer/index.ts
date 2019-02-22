import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddActiveFormContainerAction extends Action {
  containerId?: string;
  callback?: (...args: any[]) => any;
}
export interface IAddActiveFormContainerActionFulfilled extends Action {
  containerId?: string;
  callback?: (...args: any[]) => any;
}
export interface IAddActiveFormContainerRejected extends Action {
  error: Error;
}

export function addActiveFormContainerAction(
  containerId: string,
  callback?: (...args: any[]) => any) {
  return {
    type: ActionTypes.ADD_ACTIVE_FORM_CONTAINER,
    containerId,
    callback,
  };
}
export function addActiveFormContainerActionFulfilled(
  containerId: string,
  callback?: (...args: any[]) => any) {
  return {
    type: ActionTypes.ADD_ACTIVE_FORM_CONTAINER_FULFILLED,
    containerId,
    callback,
  };
}
export function addActiveFormContainerRejected(error: Error): IAddActiveFormContainerRejected {
  return {
    type: ActionTypes.ADD_ACTIVE_FORM_CONTAINER_REJECTED,
    error,
  };
}
