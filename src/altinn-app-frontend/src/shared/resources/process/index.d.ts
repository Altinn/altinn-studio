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

export interface ICompleteProcessRejected {
  error: Error;
}

export interface IGetProcessStateFulfilled {
  processStep: ProcessTaskType;
  taskId: string;
}

export interface IGetProcessStateRejected {
  error: Error;
}
