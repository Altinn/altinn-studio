import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddFormContainerAction extends Action {
  container: ICreateFormContainer;
  positionAfterId?: string;
  activeContainerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormContainerActionFulfilled extends Action {
  container: ICreateFormContainer;
  id: string;
  positionAfterId?: string;
  baseContainerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormContainerActionRejected extends Action {
  error: Error;
}

export function addFormContainerAction(
  container: ICreateFormContainer,
  positionAfterId?: string,
  activeContainerId?: string,
  callback?: (...args: any[]) => any,
): IAddFormContainerAction {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER,
    container,
    positionAfterId,
    activeContainerId,
    callback,
  };
}

export function addFormContainerActionFulfilled(
  container: ICreateFormContainer,
  id: string,
  positionAfterId?: string,
  baseContainerId?: string,
  callback?: (...args: any[]) => any,
): IAddFormContainerActionFulfilled {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER_FULFILLED,
    container,
    id,
    positionAfterId,
    baseContainerId,
    callback,
  };
}

export function addFormContainerActionRejected(error: Error): IAddFormContainerActionRejected {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER_REJECTED,
    error,
  };
}
