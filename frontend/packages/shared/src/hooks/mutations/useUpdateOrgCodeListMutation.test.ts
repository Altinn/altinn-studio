import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import type { CodeList } from '../../types/CodeList';
import { useUpdateOrgCodeListMutation } from './useUpdateOrgCodeListMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import type { CodeListData } from '../../types/CodeListData';

// Test data:
const codeList: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const oldCodeList: CodeListData = {
  title: 'old-title',
  data: codeList,
};

const updatedCodeList: CodeListData = {
  title: 'updated-title',
  data: codeList,
};

describe('useUpdateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls updateCodeListForOrg with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListMutation(org));
    await result.current.mutateAsync({ ...updatedCodeList });
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledWith(
      org,
      updatedCodeList.title,
      updatedCodeList.data,
    );
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], [oldCodeList]);
    const updateCodeListForOrg = jest.fn(() => Promise.resolve([updatedCodeList]));
    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListMutation(org), {
      queryClient,
      queries: { updateCodeListForOrg },
    });

    await result.current.mutateAsync({ ...updatedCodeList });

    const expectedUpdatedData: CodeListsResponse = [updatedCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
