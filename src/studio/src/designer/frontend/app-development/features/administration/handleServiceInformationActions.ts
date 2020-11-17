import { Action } from 'redux';
// eslint-disable-next-line import/no-cycle
import { IRepository } from '../../types/global';
import * as ActionTypes from './handleServiceInformationActionTypes';

export interface IFetchServiceAction extends Action {
  url: string;
}

export interface IFetchServiceFulfilled extends Action {
  repository: IRepository;
}

export interface IFetchServiceRejected extends Action {
  error: Error;
}

export function fetchServiceAction(url: string): IFetchServiceAction {
  return {
    type: ActionTypes.FETCH_SERVICE,
    url,
  };
}

export function fetchServiceFulfilledAction(repository: any): IFetchServiceFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICE_FULFILLED,
    repository,
  };
}

export function fetchServiceRejectedAction(error: Error): IFetchServiceRejected {
  return {
    type: ActionTypes.FETCH_SERVICE_REJECTED,
    error,
  };
}

export interface IFetchServiceNameAction extends Action {
  url: string;
}

export interface IFetchServiceNameFulfilled extends Action {
  serviceName: any;
}

export interface IFetchServiceNameRejected extends Action {
  error: Error;
}

export function fetchServiceNameAction(url: string): IFetchServiceNameAction {
  return {
    type: ActionTypes.FETCH_SERVICE_NAME,
    url,
  };
}

export function fetchServiceNameFulfilledAction(serviceName: any): IFetchServiceNameFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICE_NAME_FULFILLED,
    serviceName,
  };
}

export function fetchServiceNameRejectedAction(error: Error): IFetchServiceRejected {
  return {
    type: ActionTypes.FETCH_SERVICE_NAME_REJECTED,
    error,
  };
}

export interface ISaveServiceNameAction extends Action {
  url: string;
  newServiceName: string;
}

export interface ISaveServiceNameFulfilled extends Action {
  newServiceName: string;
}

export interface ISaveServiceNameRejected extends Action {
  error: Error;
}

export function saveServiceNameAction(url: string, newServiceName: string): ISaveServiceNameAction {
  return {
    type: ActionTypes.SAVE_SERVICE_NAME,
    url,
    newServiceName,
  };
}

export function saveServiceNameFulfilledAction(newServiceName: string): ISaveServiceNameFulfilled {
  return {
    type: ActionTypes.SAVE_SERVICE_NAME_FULFILLED,
    newServiceName,
  };
}

export function saveServiceNameRejectedAction(error: Error): ISaveServiceNameRejected {
  return {
    type: ActionTypes.SAVE_SERVICE_NAME_REJECTED,
    error,
  };
}

export interface IFetchInitialCommitAction extends Action {
  url: string;
}

export interface IFetchInitialCommitFulfilled extends Action {
  result: any;
}

export interface IFetchInitialCommitRejected extends Action {
  error: Error;
}

export function fetchInitialCommitAction(url: string): IFetchInitialCommitAction {
  return {
    type: ActionTypes.FETCH_INITIAL_COMMIT,
    url,
  };
}

export function fetchInitialCommitFulfilledAction(result: any): IFetchInitialCommitFulfilled {
  return {
    type: ActionTypes.FETCH_INITIAL_COMMIT_FULFILLED,
    result,
  };
}

export function fetchInitialCommitRejectedAction(error: Error): IFetchInitialCommitRejected {
  return {
    type: ActionTypes.FETCH_INITIAL_COMMIT_REJECTED,
    error,
  };
}

export interface IFetchServiceConfigAction extends Action {
  url: string;
}

export interface IFetchServiceConfigFulfilled extends Action {
  serviceConfig: any;
}

export interface IFetchServiceConfigRejected extends Action {
  error: Error;
}

export function fetchServiceConfigAction(url: string): IFetchServiceConfigAction {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG,
    url,
  };
}

export function fetchServiceConfigFulfilledAction(serviceConfig: any): IFetchServiceConfigFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG_FULFILLED,
    serviceConfig,
  };
}

export function fetchServiceConfigRejectedAction(error: Error): IFetchServiceConfigRejected {
  return {
    type: ActionTypes.FETCH_SERVICE_CONFIG_REJECTED,
    error,
  };
}

export interface ISaveServiceConfigAction extends Action {
  url: string;
  newServiceDescription: string;
  newServiceId: string;
  newServiceName: string;
}

export interface ISaveServiceConfigFulfilled extends Action {
  newServiceDescription: string;
  newServiceId: string;
  newServiceName: string;
}

export interface ISaveServiceConfigRejected extends Action {
  error: Error;
}

// eslint-disable-next-line max-len
export function saveServiceConfigAction(
  url: string,
  newServiceDescription: string,
  newServiceId: string,
  newServiceName: string,
): ISaveServiceConfigAction {
  return {
    type: ActionTypes.SAVE_SERVICE_CONFIG,
    url,
    newServiceDescription,
    newServiceId,
    newServiceName,
  };
}

// eslint-disable-next-line max-len
export function saveServiceConfigFulfilledAction(
  newServiceDescription: string,
  newServiceId: string,
  newServiceName: string,
): ISaveServiceConfigFulfilled {
  return {
    type: ActionTypes.SAVE_SERVICE_CONFIG_FULFILLED,
    newServiceDescription,
    newServiceId,
    newServiceName,
  };
}

export function saveServiceConfigRejectedAction(error: Error): ISaveServiceConfigRejected {
  return {
    type: ActionTypes.SAVE_SERVICE_CONFIG_REJECTED,
    error,
  };
}
