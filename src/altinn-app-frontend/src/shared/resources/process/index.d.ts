import type { ProcessTaskType } from 'src/types';

export interface IProcessState {
  availableNextTasks?: string[];
  taskType: ProcessTaskType | null;
  error: Error | null;
  taskId: string | null | undefined;
}

export interface IGetTasksFulfilled {
  processStep?: ProcessTaskType;
  tasks?: string[];
  task?: string;
}

export interface ICompleteProcessFulfilled {
  processStep: ProcessTaskType;
  taskId: string | null | undefined;
}

export type IGetProcessStateFulfilled = ICompleteProcessFulfilled;

interface CommonRejected {
  error: Error;
}

export type ICompleteProcessRejected = CommonRejected;
export type IGetProcessStateRejected = CommonRejected;
