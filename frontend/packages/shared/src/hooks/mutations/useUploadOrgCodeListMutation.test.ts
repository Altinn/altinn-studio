import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useUploadOrgCodeListMutation } from './useUploadOrgCodeListMutation';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';
import type { CodeList } from 'app-shared/types/CodeList';
import { FileUtils } from '@studio/pure-functions';

// Test data:
const fileName = 'fileName';
const fileData = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const file = new File(fileData, `${fileName}.json`, { type: 'text/json' });
const formData = FileUtils.convertToFormData(file);

const codeListResponse: CodeListsResponse = [
  {
    title: fileName,
    data: fileData,
  },
];

describe('useUploadOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls uploadCodeListForOrg with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUploadOrgCodeListMutation(org));
    await result.current.mutateAsync(file);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledWith(org, formData);
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    const uploadCodeListForOrg = jest.fn(() => Promise.resolve([codeListResponse]));
    const { result } = renderHookWithProviders(() => useUploadOrgCodeListMutation(org), {
      queryClient,
      queries: { uploadCodeListForOrg },
    });

    await result.current.mutateAsync(file);

    const expectedUpdatedData: CodeListsResponse = [codeListResponse];
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
