import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddFormContainerAction extends Action {
  container: ICreateFormContainer;
  callback?: (...args: any[]) => any;
}

export interface IAddFormContainerActionFulfilled extends Action {
  container: ICreateFormContainer;
  id: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormContainerActionRejected extends Action {
  error: Error;
}

export function addFormContainerAction(
  container: ICreateFormContainer,
  callback?: (...args: any[]) => any,
): IAddFormContainerAction {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER,
    container,
    callback,
  };
}

export function addFormContainerActionFulfilled(
  container: ICreateFormContainer,
  id: string,
  callback?: (...args: any[]) => any,
): IAddFormContainerActionFulfilled {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER_FULFILLED,
    container,
    id,
    callback,
  };
}

export function addFormContainerActionRejected(error: Error): IAddFormContainerActionRejected {
  return {
    type: ActionTypes.ADD_FORM_CONTAINER_REJECTED,
    error,
  };
}
