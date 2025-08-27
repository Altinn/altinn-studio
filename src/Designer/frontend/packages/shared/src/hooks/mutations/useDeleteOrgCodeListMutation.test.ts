import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useDeleteOrgCodeListMutation } from './useDeleteOrgCodeListMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
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

const codeListToDelete: CodeListData = {
  title: 'deleted-title',
  data: codeList,
};

const otherCodeList: CodeListData = {
  title: 'other-title',
  data: codeList,
};

describe('useDeleteOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls deleteOrgCodeList with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useDeleteOrgCodeListMutation(org));
    await result.current.mutateAsync(title);
    expect(queriesMock.deleteOrgCodeList).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteOrgCodeList).toHaveBeenCalledWith(org, title);
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], [codeListToDelete, otherCodeList]);
    const deleteOrgCodeList = jest.fn(() => Promise.resolve([otherCodeList]));
    const { result } = renderHookWithProviders(() => useDeleteOrgCodeListMutation(org), {
      queryClient,
      queries: { deleteOrgCodeList },
    });

    await result.current.mutateAsync(codeListToDelete.title);

    const expectedUpdatedData: CodeListsResponse = [otherCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
