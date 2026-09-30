import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../testing/mocks';
import { useTaskNavigationGroupQuery } from './useTaskNavigationGroupQuery';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

const taskNavigationGroups: TaskNavigationGroup[] = [
  { taskId: 'task1', taskType: 'taskType1', name: 'name1' },
  { taskId: 'task2', taskType: 'taskType2', name: 'name2' },
];
const getTaskNavigationGroupV4 = jest.fn(() => Promise.resolve(taskNavigationGroups));

describe('useTaskNavigationGroupQuery', () => {
  afterEach(jest.clearAllMocks);

  it('calls getTaskNavigationGroupV4 and stores the result in the cache', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderHookWithProviders(() => useTaskNavigationGroupQuery(org, app), {
      queries: { getTaskNavigationGroupV4 },
      queryClient,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key: TanstackQueryKey = [QueryKey.TaskNavigationGroup, org, app];
    expect(getTaskNavigationGroupV4).toHaveBeenCalledWith(org, app);
    expect(queryClient.getQueryData(key)).toEqual(taskNavigationGroups);
  });
});
