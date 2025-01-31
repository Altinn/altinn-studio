import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useDeleteOrgCodeListMutation } from '../../hooks/mutations/useDeleteOrgCodeListMutation';

// Test data:
const codeListId = 'testId';

describe('useDeleteOrgCodeListMutation', () => {
  beforeEach(jest.clearAllMocks);

  it('Calls useDeleteOrgCodeListMutation with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useDeleteOrgCodeListMutation(org));
    await result.current.mutateAsync({ codeListId });
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledWith(org, codeListId);
  });
});
