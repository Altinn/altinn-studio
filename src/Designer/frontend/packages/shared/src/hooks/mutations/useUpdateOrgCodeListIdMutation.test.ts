import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useUpdateOrgCodeListIdMutation } from './useUpdateOrgCodeListIdMutation';
import type { CodeListWithTextResources } from 'app-shared/types/CodeListWithTextResources';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';

// Test data:
const org = 'organisation';
const codeListId: string = 'codeListId';
const newCodeListId: string = 'newCodeListId';
const codeListMock: CodeListWithTextResources = [{ value: 'value', label: 'label' }];

// Mocks
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('useUpdateOrgCodeListIdMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls updateOrgCodeListId with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListIdMutation(org));
    await result.current.mutateAsync({ codeListId, newCodeListId });

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

    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListIdMutation(org), {
      queryClient,
    });
    await result.current.mutateAsync({ codeListId: codeListA, newCodeListId });

    const cacheData: CodeListsResponse = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(cacheData[0].title).toEqual(newCodeListId);
    expect(cacheData[1].title).toEqual(codeListB);
  });
});
