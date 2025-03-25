import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useTaskNavigationGroupQuery } from './useTaskNavigationGroupQuery';
import type { QueryClient, QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { waitFor } from '@testing-library/react';
import { QueryKey } from 'app-shared/types/QueryKey';

const taskNavigationGroups = [
  {
    taskId: 'task1',
    taskType: 'taskType1',
    name: 'name1',
  },
  {
    taskId: 'task2',
    taskType: 'taskType2',
    name: 'name2',
  },
];

const getTaskNavigationGroup = jest.fn(() => Promise.resolve(taskNavigationGroups));

describe('useTaskNavigationGroupQuery', () => {
  beforeEach(getTaskNavigationGroup.mockClear);

  it('calls getTaskNavigationGroup with the correct parameters', async () => {
    await renderAndWaitForResult();
    expect(getTaskNavigationGroup).toHaveBeenCalledTimes(1);
    expect(getTaskNavigationGroup).toHaveBeenCalledWith(org, app);
  });

  it('Stores the result in the cache with correct keys', async () => {
    const client = createQueryClientMock();
    await renderAndWaitForResult(client);
    const key: TanstackQueryKey = [QueryKey.TaskNavigationGroup, org, app];
    expect(client.getQueryData(key)).toEqual(taskNavigationGroups);
  });
});

const renderAndWaitForResult = async (
  queryClient: QueryClient = createQueryClientMock(),
): Promise<void> => {
  const { result } = renderHookWithProviders(() => useTaskNavigationGroupQuery(org, app), {
    queries: { getTaskNavigationGroup },
    queryClient,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
};
