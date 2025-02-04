import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useDeleteOrgCodeListMutation } from '../../hooks/mutations/useDeleteOrgCodeListMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import { useCreateOrgCodeListMutation } from '../../hooks/mutations/useCreateOrgCodeListMutation';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import type { CodeListData } from '../../types/CodeListData';
import type { CodeList } from '../../types/CodeList';

// Test data:
const title = 'testId';

const codeList: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const deletedCodeList: CodeListData = {
  title: 'deleted-title',
  data: codeList,
};

const otherCodeList: CodeListData = {
  title: 'other-title',
  data: codeList,
};

describe('useDeleteOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls deleteCodeListForOrg with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useDeleteOrgCodeListMutation(org));
    await result.current.mutateAsync({ title });
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledWith(org, title);
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], [deletedCodeList, otherCodeList]);
    const createCodeListForOrg = jest.fn(() => Promise.resolve([otherCodeList]));
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org), {
      queryClient,
      queries: { createCodeListForOrg },
    });

    await result.current.mutateAsync({ title: deletedCodeList.title });

    const expectedUpdatedData: CodeListsResponse = [otherCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
