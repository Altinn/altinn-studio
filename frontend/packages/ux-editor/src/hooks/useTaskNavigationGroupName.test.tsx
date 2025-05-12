import { renderHookWithProviders } from 'dashboard/testing/mocks';
import { useTaskNavigationGroupName } from './useTaskNavigationGroupName';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock, layoutSetsExtendedMock } from '../testing/layoutSetsMock';

const mockTask = {
  name: 'Test Task',
  taskId: 'Task_1',
  taskType: 'data',
};

describe('useTaskNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return task name and id', () => {
    const { result } = renderUseTaskNames(mockTask);
    expect(result.current.taskNavigationName).toBe('Test Task');
    expect(result.current.taskIdName).toBe(layoutSet1NameMock);
  });

  it('should return default task name if name is not provided', () => {
    const taskWithoutName = { ...mockTask, name: undefined };
    const { result } = renderUseTaskNames(taskWithoutName);
    expect(result.current.taskNavigationName).toBe(textMock('ux_editor.task_table_type.data'));
  });
});

const renderUseTaskNames = (task: TaskNavigationGroup) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);

  return renderHookWithProviders(() => useTaskNavigationGroupName(task), {
    queryClient,
  });
};
