import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useCreateOrgCodeListMutation } from './useCreateOrgCodeListMutation';
import type { CodeList } from '../../types/CodeList';
import type { CodeListData } from '../../types/CodeListData';

// Test data:
const codeList: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const codeListData: CodeListData = {
  title: 'test-title',
  data: codeList,
};

describe('useCreateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls useCreateOrgCodeListMutation with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useCreateOrgCodeListMutation(org));
    await result.current.mutateAsync({
      codeListTitle: codeListData.title,
      codeList: codeListData.data,
    });
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createCodeListForOrg).toHaveBeenCalledWith(
      org,
      codeListData.title,
      codeListData.data,
    );
  });
});
