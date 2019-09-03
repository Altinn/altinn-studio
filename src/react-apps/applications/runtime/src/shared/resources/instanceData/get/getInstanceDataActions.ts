import { Action } from 'redux';
import * as ActionTypes from './getInstanceDataActionTypes';

export interface IGetInstanceData extends Action {
  instanceOwner: string;
  instanceId: string;
}
export interface IGetInstanceDataFulfilled extends Action {
  instanceData: any;
}
export interface IGetInstanceDataRejected extends Action {
  error: Error;
}

export function getInstanceData(instanceOwner: string, instanceId: string): IGetInstanceData {
  return {
    type: ActionTypes.GET_INSTANCEDATA,
    instanceOwner,
    instanceId,
  };
}

export function getInstanceDataFulfilled(instanceData: any): IGetInstanceDataFulfilled {
  return {
    type: ActionTypes.GET_INSTANCEDATA_FULFILLED,
    instanceData,
  };
}

export function getInstanceDataRejected(error: Error): IGetInstanceDataRejected {
  return {
    type: ActionTypes. GET_INSTANCEDATA_REJECTED,
    error,
  };
}
