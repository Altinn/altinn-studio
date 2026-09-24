import { getTaskTypeById } from 'src/features/instance/useProcessQuery';
import { ProcessTaskType } from 'src/types';
import type { IProcess, ITask } from 'src/types/shared';

const currentTask: ITask = {
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
};

function makeProcess(overrides?: Partial<IProcess>): IProcess {
  return {
    started: '2020-01-01',
    startEvent: null,
    currentTask,
    processTasks: [{ elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' }],
    ended: null,
    endEvent: null,
    ...overrides,
  };
}

describe('getTaskTypeById', () => {
  it('classifies a ServiceTask found in processTasks as Service, even when currentTask is a different data task', () => {
    const processData = makeProcess({
      processTasks: [
        { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
        { elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' },
      ],
    });

    expect(getTaskTypeById(processData, 'Task_Pdf', false, {})).toBe(ProcessTaskType.Service);
  });

  it('uses currentTask for the current task, even when its processTasks entry lacks elementType', () => {
    const processData = makeProcess({
      currentTask: { ...currentTask, elementType: 'ServiceTask' },
      processTasks: [{ elementId: 'Task_1', altinnTaskType: 'data' }],
    });

    expect(getTaskTypeById(processData, 'Task_1', false, {})).toBe(ProcessTaskType.Service);
  });
});
