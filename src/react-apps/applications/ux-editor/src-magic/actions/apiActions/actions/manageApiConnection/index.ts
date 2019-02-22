import { Action } from 'redux';
import * as ActionTypes from '../../apiActionTypes';

export interface IAddApiConnection extends Action {
  newConnection: any;
}

export interface IAddApiConnectionFulfilled extends Action {
  newConnection: any;
}

export interface IAddApiConnectionRejected extends Action {
  error: Error;
}

export function addApiConnection(newConnection: any): IAddApiConnection {
  return {
    type: ActionTypes.ADD_API_CONNECTION,
    newConnection,
  };
}

export function addApiConnectionFulfilled(newConnection: any): IAddApiConnectionFulfilled {
  return {
    type: ActionTypes.ADD_API_CONNECTION_FULFILLED,
    newConnection,
  };
}

export function addApiConnectionRejected(error: Error): IAddApiConnectionRejected {
  return {
    type: ActionTypes.ADD_API_CONNECTION_REJECTED,
    error,
  };
}

export interface IDelApiConnection extends Action {
  connectionId: any;
}

export interface IDelApiConnectionFulfilled extends Action {
  newConnectionsObj: any;
}

export interface IDelApiConnectionRejected extends Action {
  error: Error;
}

export function delApiConnection(connectionId: any): IDelApiConnection {
  return {
    type: ActionTypes.DELETE_API_CONNECTION,
    connectionId,
  };
}

export function delApiConnectionFulfilled(newConnectionsObj: any): IDelApiConnectionFulfilled {
  return {
    type: ActionTypes.DELETE_API_CONNECTION_FULFILLED,
    newConnectionsObj,
  };
}

export function delApiConnectionRejected(error: Error): IDelApiConnectionRejected {
  return {
    type: ActionTypes.DELETE_API_CONNECTION_REJECTED,
    error,
  };
}
