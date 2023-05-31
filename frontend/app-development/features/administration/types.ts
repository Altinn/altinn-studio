import type { Repository } from 'app-shared/types/Repository';

export interface IFetchInitialCommitAction {
  url: string;
}

export interface IFetchInitialCommitFulfilled {
  result: any;
}

export interface IFetchServiceAction {
  url: string;
}

export interface IFetchServiceFulfilled {
  repository: Repository;
}

export interface IFetchServiceNameAction {
  url: string;
}

export interface IFetchServiceNameFulfilled {
  serviceName: any;
}

export interface IFetchServiceConfigAction {
  url: string;
}

export interface IFetchServiceConfigFulfilled {
  serviceConfig: any;
}

export interface IHandleServiceInformationActionRejected {
  error: Error;
}

export interface ISaveServiceConfigAction {
  url: string;
  newServiceDescription: string;
  newServiceId: string;
  newServiceName: string;
}

export interface ISaveServiceConfigFulfilled {
  newServiceDescription: string;
  newServiceId: string;
  newServiceName: string;
}

export interface ISaveServiceNameAction {
  url: string;
  newServiceName: string;
}

export interface ISaveServiceNameFulfilled {
  newServiceName: string;
}
