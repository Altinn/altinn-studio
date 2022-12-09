import type { IInstance } from 'src/types/shared';

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
