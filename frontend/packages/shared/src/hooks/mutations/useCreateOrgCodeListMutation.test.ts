import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useCreateOrgCodeListMutation } from 'app-shared/hooks/mutations/useCreateOrgCodeListMutation';
import type { CodeListData } from 'app-shared/types/CodeListData';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CodeList } from '@studio/components';

// Test data:
const codeList: CodeList = [
  {
    value: 'test-value',
    label: 'name',
  },
];

const codeListData: CodeListData = {
  title: 'test',
  data: codeList,
};

describe('useCreateOrgCodeListMutation', () => {
  it('Calls useCreateOrgCodeListMutation with correct parameters', async () => {
    const renderCreateOrgCodeListMutationResult = renderHookWithProviders(() =>
      useCreateOrgCodeListMutation(org),
    ).result;
    await renderCreateOrgCodeListMutationResult.current.mutateAsync({
      codeListId: codeListData.title,
      payload: codeList,
    });
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledWith(
      org,
      codeListData.title,
      codeList,
    );
  });

  it('Sets the cache with the new option list', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], []);
    const renderCreateOrgCodeListMutationResult = renderHookWithProviders(
      () => useCreateOrgCodeListMutation(org),
      { queryClient },
    ).result;
    await renderCreateOrgCodeListMutationResult.current.mutateAsync({
      codeListId: codeListData.title,
      payload: codeList,
    });
    const cacheData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(cacheData).toEqual([
      {
        codeListId: codeListData.title,
        payload: codeList,
      },
    ]);
  });

  it('Invalidates?', async () => {});
});
