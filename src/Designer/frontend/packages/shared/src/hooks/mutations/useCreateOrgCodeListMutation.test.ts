import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useCreateOrgCodeListMutation } from './useCreateOrgCodeListMutation';
import type { CodeListWithTextResources } from '../../types/CodeListWithTextResources';
import type { CodeListDataWithTextResources } from '../../types/CodeListDataWithTextResources';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';

// Test data:
const codeList: CodeListWithTextResources = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const newCodeList: CodeListDataWithTextResources = {
  title: 'new-title',
  data: codeList,
};

const existingCodeList: CodeListDataWithTextResources = {
  title: 'existing-title',
  data: codeList,
};

describe('useCreateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls createOrgCodeList with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org));

    await result.current.mutateAsync(newCodeList);

    expect(queriesMock.createOrgCodeList).toHaveBeenCalledTimes(1);
    expect(queriesMock.createOrgCodeList).toHaveBeenCalledWith(
      org,
      newCodeList.title,
      newCodeList.data,
    );
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], [existingCodeList]);
    const createOrgCodeList = jest.fn(() => Promise.resolve([existingCodeList, newCodeList]));
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org), {
      queryClient,
      queries: { createOrgCodeList },
    });

    await result.current.mutateAsync(newCodeList);

    const expectedUpdatedData: CodeListsResponse = [existingCodeList, newCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
