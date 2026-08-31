import { org, app } from '@studio/testing/testids';
import { renderHookWithProviders } from '../../testing/mocks';
import { useTaskNavigationGroupMutation } from './useTaskNavigationGroupMutation';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

describe('useTaskNavigationGroupMutation', () => {
  it('Calls updateTaskNavigationGroupV4 with correct arguments and payload', async () => {
    const { result } = renderTaskNavigationGroupMutation();
    const payload: TaskNavigationGroup[] = [
      {
        taskType: 'data',
        name: 'name1',
        taskId: 'taskId1',
      },
    ];

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.updateTaskNavigationGroupV4).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTaskNavigationGroupV4).toHaveBeenCalledWith(org, app, payload);
  });
});

const renderTaskNavigationGroupMutation = () => {
  return renderHookWithProviders(() => useTaskNavigationGroupMutation(org, app));
};
