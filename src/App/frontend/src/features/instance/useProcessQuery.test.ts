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

  it('classifies a processTasks entry by its altinnTaskType when it is not a ServiceTask', () => {
    const processData = makeProcess({
      processTasks: [
        { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
        { elementId: 'Task_Confirm', elementType: 'Task', altinnTaskType: 'confirmation' },
      ],
    });

    expect(getTaskTypeById(processData, 'Task_Confirm', false, {})).toBe(ProcessTaskType.Confirm);
  });

  it('falls back to currentTask.elementType when the matching list entry is missing elementType', () => {
    const processData = makeProcess({
      currentTask: { ...currentTask, elementType: 'ServiceTask' },
      processTasks: [{ elementId: 'Task_1', altinnTaskType: 'data' }],
    });

    expect(getTaskTypeById(processData, 'Task_1', false, {})).toBe(ProcessTaskType.Service);
  });

  it('classifies a task with a ui folder as Data even when it is a ServiceTask', () => {
    const processData = makeProcess({
      processTasks: [{ elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' }],
    });

    expect(getTaskTypeById(processData, 'Task_Pdf', false, { Task_Pdf: {} })).toBe(ProcessTaskType.Data);
  });

  it('returns Unknown for a taskId that cannot be found anywhere', () => {
    const processData = makeProcess();

    expect(getTaskTypeById(processData, 'Task_Nonexistent', false, {})).toBe(ProcessTaskType.Unknown);
  });

  it('returns Archived for the ProcessEnd task id, and when the process has ended', () => {
    const processData = makeProcess({ ended: '2020-02-02' });

    expect(getTaskTypeById(processData, 'ProcessEnd', false, {})).toBe(ProcessTaskType.Archived);
    expect(getTaskTypeById(processData, 'Task_1', false, {})).toBe(ProcessTaskType.Archived);
  });

  it('returns Data for any task id when the app is stateless', () => {
    const processData = makeProcess({
      processTasks: [{ elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' }],
    });

    expect(getTaskTypeById(processData, 'Task_Pdf', true, {})).toBe(ProcessTaskType.Data);
  });
});
