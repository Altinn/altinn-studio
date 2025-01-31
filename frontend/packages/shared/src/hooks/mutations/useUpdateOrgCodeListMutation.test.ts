import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import type { CodeList } from '../../types/CodeList';
import { useUpdateOrgCodeListMutation } from './useUpdateOrgCodeListMutation';

// Test data:
const codeListId = 'testId';
const payload: CodeList = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

describe('useUpdateOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls useUpdateOrgCodeListMutation with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUpdateOrgCodeListMutation(org));
    await result.current.mutateAsync({ codeListId, payload });
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledWith(org, codeListId, payload);
  });
});
