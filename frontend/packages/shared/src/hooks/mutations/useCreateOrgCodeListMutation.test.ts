import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useCreateOrgCodeListMutation } from './useCreateOrgCodeListMutation';
import type { CodeList } from '../../types/CodeList';
import type { CodeListData } from '../../types/CodeListData';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

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

const existingCodeLists: CodeListData[] = [
  {
    title: 'existing-title',
    data: [...codeList],
  },
  {
    title: 'another-existing-title',
    data: [...codeList],
  },
];

describe('useCreateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls useCreateOrgCodeListMutation with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org));
    await result.current.mutateAsync({
      title: newCodeList.title,
      codeList: newCodeList.data,
    });
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledWith(
      org,
      newCodeList.title,
      newCodeList.data,
    );
  });

  it('Adds newly created data to existing cache', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgCodeLists, org], existingCodeLists);
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org), {
      queryClient,
    });

    await result.current.mutateAsync({ ...newCodeList });

    const expectedUpdatedData = [...existingCodeLists, newCodeList];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
