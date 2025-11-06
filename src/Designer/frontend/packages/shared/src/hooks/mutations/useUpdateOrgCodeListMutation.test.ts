import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import type { CodeListWithTextResources } from '../../types/CodeListWithTextResources';
import { useUpdateOrgCodeListMutation } from './useUpdateOrgCodeListMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import type { CodeListDataWithTextResources } from '../../types/CodeListDataWithTextResources';

// Test data:
const codeList: CodeListWithTextResources = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const oldCodeList: CodeListDataWithTextResources = {
  title: 'old-title',
  data: codeList,
};

const updatedCodeList: CodeListDataWithTextResources = {
  title: 'updated-title',
  data: codeList,
};

describe('useUpdateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls updateOrgCodeList with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListMutation(org));
    await result.current.mutateAsync(updatedCodeList);
    expect(queriesMock.updateOrgCodeList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOrgCodeList).toHaveBeenCalledWith(
      org,
      updatedCodeList.title,
      updatedCodeList.data,
    );
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], [oldCodeList]);
    const updateOrgCodeList = jest.fn(() => Promise.resolve([updatedCodeList]));
    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListMutation(org), {
      queryClient,
      queries: { updateOrgCodeList },
    });

    await result.current.mutateAsync(updatedCodeList);

    const expectedUpdatedData: CodeListsResponse = [updatedCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
