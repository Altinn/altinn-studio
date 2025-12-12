export interface TaskActions {
  read: boolean;
  write: boolean;
}

export interface UserAction {
  id: string;
  authorized: boolean;
  type: string;
}

export interface CurrentTask {
  actions: TaskActions;
  userActions: UserAction[];
  read: boolean;
  write: boolean;
  flow: number;
  started: string;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended: string | null;
  validated: string | null;
  flowType: string;
}

export interface ProcessTask {
  altinnTaskType: string;
  elementId: string;
}

export interface ProcessSchema {
  currentTask: CurrentTask;
  processTasks: ProcessTask[];
  started: string;
  startEvent: string;
  ended: string | null;
  endEvent: string | null;
}

export const exampleProcess: ProcessSchema = {
  currentTask: {
    actions: {
      read: true,
      write: true,
    },
    userActions: [
      {
        id: 'read',
        authorized: true,
        type: 'ProcessAction',
      },
      {
        id: 'write',
        authorized: true,
        type: 'ProcessAction',
      },
    ],
    read: true,
    write: true,
    flow: 2,
    started: '2025-02-12T11:42:41.9536245Z',
    elementId: 'Task_1',
    name: 'Utfylling',
    altinnTaskType: 'data',
    ended: null,
    validated: null,
    flowType: 'CompleteCurrentMoveToNext',
  },
  processTasks: [
    {
      altinnTaskType: 'data',
      elementId: 'Task_1',
    },
    {
      altinnTaskType: 'data',
      elementId: 'PreviousProcessSummary',
    },
  ],
  started: '2025-02-12T11:42:41.95357Z',
  startEvent: 'StartEvent_1',
  ended: null,
  endEvent: null,
};
