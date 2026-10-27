import { getLayoutSettingsMock } from 'src/__mocks__/getUiConfigMock';
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
    expect(getTaskTypeById(process, 'Approval', false, {}, false)).toBe(ProcessTaskType.Service);
    expect(getTaskTypeById(process, 'Sign', false, {}, false)).toBe(ProcessTaskType.Signing);
  });

  it('falls back to the current task when the list does not carry it', () => {
    const withoutList: IProcess = { ...process, processTasks: undefined };
    expect(getTaskTypeById(withoutList, 'Sign', false, {}, false)).toBe(ProcessTaskType.Signing);
    expect(getTaskTypeById(withoutList, 'Approval', false, {}, false)).toBe(ProcessTaskType.Unknown);
  });

  it('lets a ui folder named after the task win', () => {
    expect(getTaskTypeById(process, 'Sign', false, { Sign: getLayoutSettingsMock({}) }, false)).toBe(
      ProcessTaskType.Data,
    );
  });

  it('counts a service task as having a page only when its folder lists one', () => {
    const withPage = { Approval: getLayoutSettingsMock({}) };
    const emptyOrder = { Approval: getLayoutSettingsMock({ pages: { order: [] } }) };
    const emptyGroups = { Approval: getLayoutSettingsMock({ pages: { groups: [{ id: 'g', name: 'g', order: [] }] } }) };
    const pageInGroup = {
      Approval: getLayoutSettingsMock({ pages: { groups: [{ id: 'g', name: 'g', order: ['page1'] }] } }),
    };

    expect(getTaskTypeById(process, 'Approval', false, withPage, false)).toBe(ProcessTaskType.Data);
    expect(getTaskTypeById(process, 'Approval', false, pageInGroup, false)).toBe(ProcessTaskType.Data);
    expect(getTaskTypeById(process, 'Approval', false, emptyOrder, false)).toBe(ProcessTaskType.Service);
    expect(getTaskTypeById(process, 'Approval', false, emptyGroups, false)).toBe(ProcessTaskType.Service);
  });

  it('renders any service task folder in PDF mode, even one that lists no page', () => {
    // Designed and subform PDFs draw from the folder whether or not it lists a page, including
    // previews of tasks the instance has not reached.
    const emptyOrder = { Approval: getLayoutSettingsMock({ pages: { order: [] } }) };
    expect(getTaskTypeById(process, 'Approval', false, emptyOrder, true)).toBe(ProcessTaskType.Data);
  });
});
