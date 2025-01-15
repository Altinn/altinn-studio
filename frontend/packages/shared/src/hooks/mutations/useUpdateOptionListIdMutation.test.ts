import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { UpdateOptionListIdMutationArgs } from './useUpdateOptionListIdMutation';
import { useUpdateOptionListIdMutation } from './useUpdateOptionListIdMutation';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Option } from 'app-shared/types/Option';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

// Test data:
const optionListId: string = 'optionListId';
const newOptionListId: string = 'newOptionListId';
const optionListMock: Option[] = [{ value: 'value', label: 'label' }];
const args: UpdateOptionListIdMutationArgs = { optionListId, newOptionListId };

describe('useUpdateOptionListIdMutation', () => {
  test('Calls useUpdateOptionIdList with correct parameters', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OptionLists, org, app], []);
    const renderUpdateOptionListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListIdMutation(org, app),
      { queryClient },
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync(args);
    expect(queriesMock.updateOptionListId).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionListId).toHaveBeenCalledWith(
      org,
      app,
      optionListId,
      newOptionListId,
    );
  });

  test('Sets the option lists cache with new id in correct alphabetical order', async () => {
    const optionListA = 'optionListA';
    const optionListB = 'optionListB';
    const optionListC = 'optionListC';
    const optionListZ = 'optionListZ';
    const queryClient = createQueryClientMock();
    const oldData: OptionListsResponse = [
      { title: optionListA, data: optionListMock },
      { title: optionListB, data: optionListMock },
      { title: optionListZ, data: optionListMock },
    ];
    queryClient.setQueryData([QueryKey.OptionLists, org, app], oldData);
    const renderUpdateOptionListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListIdMutation(org, app),
      { queryClient },
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync({
      optionListId: optionListA,
      newOptionListId: optionListC,
    });
    const cacheData: OptionListsResponse = queryClient.getQueryData([
      QueryKey.OptionLists,
      org,
      app,
    ]);
    expect(cacheData[0].title).toEqual(optionListB);
    expect(cacheData[1].title).toEqual(optionListC);
    expect(cacheData[2].title).toEqual(optionListZ);
  });

  test('Invalidates the optionListIds query cache', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const oldData: OptionListsResponse = [
      { title: 'firstOptionList', data: optionListMock },
      { title: 'optionListId', data: optionListMock },
      { title: 'lastOptionList', data: optionListMock },
    ];
    queryClient.setQueryData([QueryKey.OptionLists, org, app], oldData);
    const renderUpdateOptionListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListIdMutation(org, app),
      { queryClient },
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync(args);
    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.OptionListIds, org, app],
    });
  });

  test('Removes the option list query cache for the old Id', async () => {
    const queryClient = createQueryClientMock();
    const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries');
    queryClient.setQueryData([QueryKey.OptionLists, org, app], []);
    const renderUpdateOptionListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListIdMutation(org, app),
      { queryClient },
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync(args);
    expect(removeQueriesSpy).toHaveBeenCalledTimes(1);
    expect(removeQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.OptionList, org, app, optionListId],
    });
  });
});
