import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { useAddLayoutSetMutation } from './useAddLayoutSetMutation';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

// Test data:
const taskType = 'data';
const layoutSetConfig: LayoutSetConfig = {
  id: 'newLayoutSetName',
  tasks: ['task_2'],
};

describe('useAddLayoutSetMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls useAddLayoutSetMutation with correct arguments and payload', async () => {
    const addLayoutSetResult = renderHookWithProviders()(() => useAddLayoutSetMutation(org, app))
      .renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({
        taskType,
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, {
      layoutSetConfig,
      taskType,
    });
  });

  it('Calls useAddLayoutSetMutation with correct arguments and payload also when taskType is not provided', async () => {
    const addLayoutSetResult = renderHookWithProviders()(() => useAddLayoutSetMutation(org, app))
      .renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, {
      layoutSetConfig,
      taskType: undefined,
    });
  });

  it('Invalidates LayoutSetsExtended and LayoutSets caches on success', async () => {
    const queryClientMock = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClientMock, 'invalidateQueries');
    const addLayoutSetResult = renderHookWithProviders(
      {},
      queryClientMock,
    )(() => useAddLayoutSetMutation(org, app)).renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({ taskType, layoutSetConfig }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.LayoutSetsExtended, org, app],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.LayoutSets, org, app],
    });
  });
});
