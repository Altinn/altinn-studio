import { Action } from 'redux';
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

export interface IFetchServiceDescriptionAction extends Action {
  url: string;
}

export interface IFetchServiceDescriptionFulfilled extends Action {
  description: any;
}

export interface IFetchServiceDescriptionRejected extends Action {
  error: Error;
}

export function fetchServiceDescriptionAction(url: string): IFetchServiceDescriptionAction {
  return {
    type: ActionTypes.FETCH_SERVICE_DESCRIPTION,
    url,
  };
}

export function fetchServiceDescriptionFulfilledAction(description: any): IFetchServiceDescriptionFulfilled {
  return {
    type: ActionTypes.FETCH_SERVICE_DESCRIPTION_FULFILLED,
    description,
  };
}

export function fetchServiceDescriptionRejectedAction(error: Error): IFetchServiceDescriptionRejected {
  return {
    type: ActionTypes.FETCH_INITIAL_COMMIT_REJECTED,
    error,
  };
}

export interface ISaveServiceDescriptionAction extends Action {
  url: string;
  newServiceDescription: string;
}

export interface ISaveServiceDescriptionFulfilled extends Action {
  newServiceDescription: string;
}

export interface ISaveServiceDescriptionRejected extends Action {
  error: Error;
}

// tslint:disable-next-line:max-line-length
export function saveServiceDescriptionAction(url: string, newServiceDescription: string): ISaveServiceDescriptionAction {
  return {
    type: ActionTypes.SAVE_SERVICE_DESCRIPTION,
    url,
    newServiceDescription,
  };
}

export function saveServiceDescriptionFulfilledAction(newServiceDescription: string): ISaveServiceDescriptionFulfilled {
  return {
    type: ActionTypes.SAVE_SERVICE_DESCRIPTION_FULFILLED,
    newServiceDescription,
  };
}

export function saveServiceDescriptionRejectedAction(error: Error): ISaveServiceDescriptionRejected {
  return {
    type: ActionTypes.SAVE_SERVICE_DESCRIPTION_REJECTED,
    error,
  };
}
