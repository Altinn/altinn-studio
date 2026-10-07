import { getTaskTypeById } from 'src/features/instance/useProcessQuery';
import { ProcessTaskType } from 'src/types';
import type { IProcess } from 'src/types/shared';

const process: IProcess = {
  started: '2026-09-18T10:00:00Z',
  currentTask: {
    elementId: 'Sign',
    altinnTaskType: 'signing',
    elementType: 'Task',
    flow: 6,
    started: '2026-09-18T10:01:00Z',
    name: 'Signering',
  },
  processTasks: [
    { elementId: 'Form', altinnTaskType: 'data', elementType: 'Task' },
    { elementId: 'Approval', altinnTaskType: 'externalApproval', elementType: 'ServiceTask' },
    { elementId: 'Sign', altinnTaskType: 'signing', elementType: 'Task' },
  ],
};

describe('getTaskTypeById', () => {
  it('resolves the task the URL names, not the current one, when the process has moved on', () => {
    // A tab parked on a service task while the process advanced to signing: the service task's own
    // type is what its URL renders, never the current task's.
    expect(getTaskTypeById(process, 'Approval', false, {})).toBe(ProcessTaskType.Service);
    expect(getTaskTypeById(process, 'Sign', false, {})).toBe(ProcessTaskType.Signing);
  });

  it('falls back to the current task when the list does not carry it', () => {
    const withoutList: IProcess = { ...process, processTasks: undefined };
    expect(getTaskTypeById(withoutList, 'Sign', false, {})).toBe(ProcessTaskType.Signing);
    expect(getTaskTypeById(withoutList, 'Approval', false, {})).toBe(ProcessTaskType.Unknown);
  });

  it('lets a ui folder named after the task win', () => {
    expect(getTaskTypeById(process, 'Sign', false, { Sign: {} })).toBe(ProcessTaskType.Data);
  });
});
