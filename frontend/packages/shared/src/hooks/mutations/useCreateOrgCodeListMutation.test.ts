import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useCreateOrgCodeListMutation } from './useCreateOrgCodeListMutation';
import type { CodeList } from '../../types/CodeList';
import type { CodeListData } from '../../types/CodeListData';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';

// Test data:
const codeList: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const newCodeList: CodeListData = {
  title: 'new-title',
  data: codeList,
};

const existingCodeList: CodeListData = {
  title: 'existing-title',
  data: codeList,
};

describe('useCreateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls createCodeListForOrg with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org));

    await result.current.mutateAsync(newCodeList);

    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledWith(
      org,
      newCodeList.title,
      newCodeList.data,
    );
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], [existingCodeList]);
    const createCodeListForOrg = jest.fn(() => Promise.resolve([existingCodeList, newCodeList]));
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org), {
      queryClient,
      queries: { createCodeListForOrg },
    });

    await result.current.mutateAsync(newCodeList);

    const expectedUpdatedData: CodeListsResponse = [existingCodeList, newCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
