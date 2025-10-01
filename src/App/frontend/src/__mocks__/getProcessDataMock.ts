import type { IProcess } from 'src/types/shared';

export function getProcessDataMock(mutate?: (process: IProcess) => void): IProcess {
  const out: IProcess = {
    started: '2020-01-01',
    startEvent: null,
    currentTask: {
      write: true,
      read: true,
      flow: 1,
      started: '2020-01-01',
      elementId: 'Task_1',
      elementType: 'Task',
      name: 'Task_1',
      altinnTaskType: 'data',
      ended: null,
      validated: null,
    },
    processTasks: [
      {
        altinnTaskType: 'data',
        elementId: 'Task_1',
      },
    ],
    ended: null,
    endEvent: null,
  };

  if (mutate) {
    mutate(out);
  }

  return out;
}
