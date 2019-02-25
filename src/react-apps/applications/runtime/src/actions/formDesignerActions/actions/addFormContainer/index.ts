import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddFormContainerAction extends Action {
  container: ICreateFormContainer;
  positionAfterId?: string;
  addToId?: string;
  activeContainerId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export interface IAddFormContainerActionFulfilled extends Action {
  container: ICreateFormContainer;
  id: string;
  positionAfterId?: string;
  addToId?: string;
  baseContainerId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export interface IAddFormContainerActionRejected extends Action {
  error: Error;
}

export function addFormContainerAction(
  container: ICreateFormContainer,
  positionAfterId?: string,
  addToId?: string,
  callback?: (...args: any[]) => any,
  destinationIndex?: number,
): IAddFormContainerAction {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER,
    container,
    positionAfterId,
    addToId,
    callback,
    destinationIndex,
  };
}

export function addFormContainerActionFulfilled(
  container: ICreateFormContainer,
  id: string,
  positionAfterId?: string,
  addToId?: string,
  baseContainerId?: string,
  callback?: (...args: any[]) => any,
  destinationIndex?: number,
): IAddFormContainerActionFulfilled {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER_FULFILLED,
    container,
    id,
    positionAfterId,
    addToId,
    baseContainerId,
    callback,
    destinationIndex,
  };
}

export function addFormContainerActionRejected(error: Error): IAddFormContainerActionRejected {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER_REJECTED,
    error,
  };
}
