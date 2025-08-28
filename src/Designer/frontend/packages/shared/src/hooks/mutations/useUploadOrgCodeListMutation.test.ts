import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useUploadOrgCodeListMutation } from './useUploadOrgCodeListMutation';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import type { CodeListsResponse } from '../../types/api/CodeListsResponse';
import type { CodeList } from '../../types/CodeList';
import { FileUtils } from '@studio/pure-functions';

// Test data:
const fileName = 'fileName';
const fileData: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const jsonData = JSON.stringify(fileData);
const file = new File([jsonData], `${fileName}.json`, { type: 'text/json' });
const formData = FileUtils.convertToFormData(file);

const codeListResponse: CodeListsResponse = [
  {
    title: fileName,
    data: fileData,
  },
];

describe('useUploadOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls uploadOrgCodeList with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUploadOrgCodeListMutation(org));
    await result.current.mutateAsync(file);
    expect(queriesMock.uploadOrgCodeList).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadOrgCodeList).toHaveBeenCalledWith(org, formData);
  });

  it('Replaces cache with api response', async () => {
    const queryClient = createQueryClientMock();
    const uploadOrgCodeList = jest.fn(() => Promise.resolve(codeListResponse));
    const { result } = renderHookWithProviders(() => useUploadOrgCodeListMutation(org), {
      queryClient,
      queries: { uploadOrgCodeList },
    });

    await result.current.mutateAsync(file);

    const expectedUpdatedData: CodeListsResponse = codeListResponse;
    const updatedData = queryClient.getQueryData([QueryKey.OrgCodeLists, org]);
    expect(updatedData).toEqual(expectedUpdatedData);
  });
});
