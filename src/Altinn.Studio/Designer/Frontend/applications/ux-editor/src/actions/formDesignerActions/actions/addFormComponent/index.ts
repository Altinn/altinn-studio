import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IAddFormComponentAction extends Action {
  component: ICreateFormComponent;
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentActionFulfilled extends Action {
  component: ICreateFormComponent;
  position: number;
  containerId?: string;
  id: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentActionRejected extends Action {
  error: Error;
}

export function addFormComponentAction(
  component: ICreateFormComponent,
  position: number,
  containerId?: string,
  callback?: (...args: any[]) => any): IAddFormComponentAction {
  return {
    type: ActionTypes.ADD_FORM_COMPONENT,
    component,
    position,
    containerId,
    callback,
  };
}

export function addFormComponentActionFulfilled(
  component: ICreateFormComponent,
  id: string,
  position: number,
  containerId?: string,
  callback?: (...args: any[]) => any,
): IAddFormComponentActionFulfilled {
  return {
    type: ActionTypes.ADD_FORM_COMPONENT_FULFILLED,
    component,
    position,
    containerId,
    id,
    callback,
  };
}

export function addFormComponentActionRejected(error: Error): IAddFormComponentActionRejected {
  return {
    type: ActionTypes.ADD_FORM_COMPONENT_REJECTED,
    error,
  };
}
