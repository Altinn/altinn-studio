import { org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useUpdateOrgCodeListIdMutation } from './useUpdateOrgCodeListIdMutation';
import type { CodeList } from 'app-shared/types/CodeList';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';

// Test data:
const codeListId: string = 'codeListId';
const newCodeListId: string = 'newCodeListId';
const codeListMock: CodeList = [{ value: 'value', label: 'label' }];

describe('useUpdateOrgCodeListIdMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls updateOrgCodeListId with correct parameters', async () => {
    const renderUpdateCodeListIdMutationResult = renderHookWithProviders(() =>
      useUpdateOrgCodeListIdMutation(org),
    ).result;
    await renderUpdateCodeListIdMutationResult.current.mutateAsync({ codeListId, newCodeListId });
    expect(queriesMock.updateOrgCodeListId).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOrgCodeListId).toHaveBeenCalledWith(org, codeListId, newCodeListId);
  });

  it('Sets the code lists cache with new id', async () => {
    const codeListA = 'codeListA';
    const codeListB = 'codeListB';
    const queryClient = createQueryClientMock();
    const oldData: CodeListsResponse = [
      { title: codeListA, data: codeListMock },
      { title: codeListB, data: codeListMock },
    ];
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], oldData);
    const renderUpdateCodeListIdMutationResult = renderHookWithProviders(
      () => useUpdateOrgCodeListIdMutation(org),
      { queryClient },
    ).result;
    await renderUpdateCodeListIdMutationResult.current.mutateAsync({
      codeListId: codeListA,
      newCodeListId,
    });
    const cacheData: CodeListsResponse = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(cacheData[0].title).toEqual(newCodeListId);
    expect(cacheData[1].title).toEqual(codeListB);
  });
});
