import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { useAddLayoutSetMutation } from './useAddLayoutSetMutation';
import type { LayoutSetConfig, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutSetIdToUpdate = 'oldLayoutSetName';
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
        layoutSetIdToUpdate,
        taskType,
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, layoutSetIdToUpdate, {
      layoutSetConfig,
      taskType,
    });
  });

  it('Calls useAddLayoutSetMutation with correct arguments and payload also when taskType is not provided', async () => {
    const addLayoutSetResult = renderHookWithProviders()(() => useAddLayoutSetMutation(org, app))
      .renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate,
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, layoutSetIdToUpdate, {
      layoutSetConfig,
      undefined,
    });
  });

  it('Sets queryData if response is of type LayoutSets', async () => {
    const layoutSets = { sets: [{ id: 'set1', tasks: ['Task_1'] }] };
    const queryClientMock = createQueryClientMock();
    const addLayoutSetMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve<LayoutSets>(layoutSets));
    const addLayoutSetResult = renderHookWithProviders(
      { addLayoutSet: addLayoutSetMock },
      queryClientMock,
    )(() => useAddLayoutSetMutation(org, app)).renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate,
        taskType,
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    const queryData = queryClientMock.getQueryData([QueryKey.LayoutSets, org, app]);
    expect(queryData).toBe(layoutSets);
  });

  it('does not set queryData if response is not an object', async () => {
    const addLayoutSetMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve('Layout set already exist error'));
    const queryClientMock = createQueryClientMock();
    const addLayoutSetResult = renderHookWithProviders(
      { addLayoutSet: addLayoutSetMock },
      queryClientMock,
    )(() => useAddLayoutSetMutation(org, app)).renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate: layoutSetIdToUpdate,
        taskType,
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    const queryData = queryClientMock.getQueryData([QueryKey.LayoutSets, org, app]);
    expect(queryData).toBe(undefined);
  });

  it('does not set queryData if response is not of type LayoutSets', async () => {
    const addLayoutSetMock = jest.fn().mockImplementation(() => Promise.resolve({}));
    const queryClientMock = createQueryClientMock();
    const addLayoutSetResult = renderHookWithProviders(
      { addLayoutSet: addLayoutSetMock },
      queryClientMock,
    )(() => useAddLayoutSetMutation(org, app)).renderHookResult.result;
    await waitFor(() =>
      addLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate: layoutSetIdToUpdate,
        taskType,
        layoutSetConfig,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    const queryData = queryClientMock.getQueryData([QueryKey.LayoutSets, org, app]);
    expect(queryData).toBe(undefined);
  });
});
