import { app, org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useDeleteOptionListMutation } from './useDeleteOptionListMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const optionsListId = 'test';

describe('useDeleteOptionListMutation', () => {
  test('Calls useDeleteOptionList with correct parameters', async () => {
    const renderDeleteOptionListMutationResult = renderHookWithProviders(() =>
      useDeleteOptionListMutation(org, app),
    ).result;
    await renderDeleteOptionListMutationResult.current.mutateAsync(optionsListId);
    expect(queriesMock.deleteOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteOptionList).toHaveBeenCalledWith(org, app, optionsListId);
  });

  test('Sets the option list ids query cache without the given option list id', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OptionListIds, org, app], [optionsListId]);
    const renderDeleteOptionListMutationResult = renderHookWithProviders(
      () => useDeleteOptionListMutation(org, app),
      { queryClient },
    ).result;
    await renderDeleteOptionListMutationResult.current.mutateAsync(optionsListId);
    expect(queryClient.getQueryData([QueryKey.OptionListIds, org, app])).toEqual([]);
  });

  test('Invalidates the option lists query cache', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData(
      [QueryKey.OptionLists, org, app],
      [{ title: optionsListId, data: [] }],
    );
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const renderDeleteOptionListMutationResult = renderHookWithProviders(
      () => useDeleteOptionListMutation(org, app),
      { queryClient },
    ).result;
    await renderDeleteOptionListMutationResult.current.mutateAsync(optionsListId);
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.OptionLists, org, app],
    });
  });

  test('Removes the option list query cache for the given option list id', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OptionList, org, app, optionsListId], []);
    const renderDeleteOptionListMutationResult = renderHookWithProviders(
      () => useDeleteOptionListMutation(org, app),
      { queryClient },
    ).result;
    await renderDeleteOptionListMutationResult.current.mutateAsync(optionsListId);
    expect(
      queryClient.getQueryData([QueryKey.OptionList, org, app, optionsListId]),
    ).toBeUndefined();
  });
});
