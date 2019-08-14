import { Action } from 'redux';
import * as ActionTypes from '../types';

export interface IInstantiate extends Action {
  org: string;
  service: string;
}

export function instantiate(org: string, service: string): IInstantiate {
  return {
    type: ActionTypes.INSTANTIATE,
    org,
    service,
  };
}

export interface IInstantiateFulfilled extends Action {
  instanceId: string;
}

export function instantiateFulfilled(instanceId: string): IInstantiateFulfilled {
  return {
    type: ActionTypes.INSTANTIATE_FULFILLED,
    instanceId,
  };
}

export interface IInstantiateRejected extends Action {
  error: Error;
}

export function instantiateRejected(error: Error): IInstantiateRejected {
  return {
    type: ActionTypes.INSTANTIAT_REJECTED,
    error,
  };
}

export function instantiateToggle(): Action {
  return {
    type: ActionTypes.INSTANTIATE_TOGGLE,
  };
}
