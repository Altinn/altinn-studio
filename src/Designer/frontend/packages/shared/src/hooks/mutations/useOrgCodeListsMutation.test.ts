import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useOrgCodeListsMutation } from './useOrgCodeListsMutation';
import type { UpdateOrgCodeListsPayload } from '../../types/api/UpdateOrgCodeListsPayload';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'test-org';
const payload: UpdateOrgCodeListsPayload = {
  codeListWrappers: [],
  baseCommitSha: 'abc123',
  commitMessage: 'Update code lists',
};

describe('useOrgCodeListsMutation', () => {
  it('Calls updateOrgCodeLists with correct arguments and payload', async () => {
    const updateOrgCodeLists = jest.fn();
    const { result } = renderHookWithProviders(() => useOrgCodeListsMutation(orgName), {
      queries: { updateOrgCodeLists },
    });

    await result.current.mutateAsync(payload);

    expect(updateOrgCodeLists).toHaveBeenCalledTimes(1);
    expect(updateOrgCodeLists).toHaveBeenCalledWith(orgName, payload);
  });

  it('Invalidates the code list cache for the given organisation', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useOrgCodeListsMutation(orgName), {
      queryClient,
    });

    await result.current.mutateAsync(payload);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.OrgCodeListsNew, orgName],
    });
  });
});
