import type { IProcess } from 'src/types/shared';

export function getProcessDataMock(): IProcess {
  return {
    started: '2020-01-01',
    startEvent: null,
    currentTask: {
      flow: 1,
      started: '2020-01-01',
      elementId: 'Task_1',
      name: 'Task_1',
      altinnTaskType: 'data',
      ended: null,
      validated: null,
    },
    ended: null,
    endEvent: null,
  };
}
