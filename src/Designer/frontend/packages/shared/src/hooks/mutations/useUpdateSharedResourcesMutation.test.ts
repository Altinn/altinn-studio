import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useUpdateSharedResourcesMutation } from './useUpdateSharedResourcesMutation';
import type { UpdateSharedResourcesRequest } from '../../types/api/UpdateSharedResourcesRequest';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'test-org';
const payload: UpdateSharedResourcesRequest = {
  files: [
    {
      path: 'shared/resource1.json',
      content: '{"key": "value"}',
      encoding: 'utf-8',
    },
  ],
  baseCommitSha: 'abc123',
  commitMessage: 'Update shared resources',
};

describe('useUpdateSharedResourcesMutation', () => {
  it('Calls updateSharedResources with correct arguments and payload', async () => {
    const updateSharedResources = jest.fn();
    const { result } = renderHookWithProviders(() => useUpdateSharedResourcesMutation(orgName), {
      queries: { updateSharedResources },
    });

    await result.current.mutateAsync(payload);

    expect(updateSharedResources).toHaveBeenCalledTimes(1);
    expect(updateSharedResources).toHaveBeenCalledWith(orgName, payload);
  });

  it('Invalidates the shared resources cache for the given organisation', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(() => useUpdateSharedResourcesMutation(orgName), {
      queryClient,
    });

    await result.current.mutateAsync(payload);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.SharedResourcesByPath, orgName],
    });
  });
});
