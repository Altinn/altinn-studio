import type { IInstance } from 'altinn-shared/types';

export interface IInstanceDataState {
  instance: IInstance | null;
  error: Error | null;
}

export interface IGetInstanceData {
  instanceId: string | undefined;
}
export interface IGetInstanceDataFulfilled {
  instanceData: any;
}
export interface IGetInstanceDataRejected {
  error: Error;
}
