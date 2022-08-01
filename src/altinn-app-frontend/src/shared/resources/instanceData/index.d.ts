import type { IInstance } from 'altinn-shared/types';

export interface IInstanceDataState {
  instance: IInstance;
  error: Error;
}

export interface IGetInstanceData {
  instanceId: string;
}
export interface IGetInstanceDataFulfilled {
  instanceData: any;
}
export interface IGetInstanceDataRejected {
  error: Error;
}
