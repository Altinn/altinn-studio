import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';

// Test data:
const codeListId = 'testId';

describe('useDeleteOrgCodeListMutation', () => {
  it('Calls useDeleteOrgCodeListMutation with correct parameters', async () => {
    const renderDeleteOrgCodeListMutationResult = renderHookWithProviders(() =>
      useDeleteOrgCodeListMutation(org),
    ).result;
    await renderDeleteOrgCodeListMutationResult.current.mutateAsync({
      codeListId,
    });
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledWith(org, codeListId);
  });
});
