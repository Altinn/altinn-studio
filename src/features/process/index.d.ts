import type { ProcessTaskType } from 'src/types';
import type { IActionType } from 'src/types/shared';

export type IProcessState = {
  availableNextTasks?: string[];
  taskType: ProcessTaskType | null;
  error: Error | null;
  taskId: string | null | undefined;
} & IProcessPermissions;

export type IProcessPermissions = {
  read?: boolean | null;
  write?: boolean | null;
  actions?: IProcessActions | null;
};

export type IProcessActions = {
  [k in IActionType]?: boolean;
};

export interface IGetTasksFulfilled {
  taskType?: ProcessTaskType;
  tasks?: string[];
  task?: string;
}

export type ICompleteProcess = {
  taskId?: string | null;
  action?: IActionType;
};

export type ICompleteProcessFulfilled = {
  taskId: string | null | undefined;
  taskType: ProcessTaskType;
} & IProcessPermissions;

export type IGetProcessStateFulfilled = ICompleteProcessFulfilled;

interface CommonRejected {
  error: Error;
}

export type ICompleteProcessRejected = CommonRejected;
export type IGetProcessStateRejected = CommonRejected;
