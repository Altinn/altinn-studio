import { Action } from 'redux';
import * as ActionTypes from '../../appDataActionTypes';

export interface ILoadTextResourcesAction extends Action {
  url: string;
}
export interface ILoadTextResourcesFulfilled extends Action {
  textResources: any;
}
export interface ILoadTextResourcesRejected extends Action {
  error: Error;
}

export function loadTextResourcesAction(url: string): ILoadTextResourcesAction {
  return {
    type: ActionTypes.LOAD_TEXT_RESOURCES,
    url,
  };
}

export function loadTextResourcesFulfilledAction(
  textResources: any,
): ILoadTextResourcesFulfilled {
  return {
    type: ActionTypes.LOAD_TEXT_RESOURCES_FULFILLED,
    textResources,
  };
}

export function loadTextResourcesRejectedAction(
  error: Error,
): ILoadTextResourcesRejected {
  return {
    type: ActionTypes.LOAD_TEXT_RESOURCES_REJECTED,
    error,
  };
}
