import type { ProcessTaskType } from 'src/types';

export interface IProcessState {
  taskType: ProcessTaskType;
  error: Error;
  taskId: string;
}

export interface ICompleteProcessFulfilled {
  processStep: ProcessTaskType;
  taskId: string;
}

export type IGetProcessStateFulfilled = ICompleteProcessFulfilled;

export interface ICompleteProcessRejected {
  error: Error;
}

export interface IGetProcessStateRejected {
  error: Error;
}
