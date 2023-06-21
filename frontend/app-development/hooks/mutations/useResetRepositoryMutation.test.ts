import { queriesMock, renderHookWithMockStore } from '../../test/mocks';
import { useResetRepositoryMutation } from './useResetRepositoryMutation';

// Test data:
const org = 'org';
const app = 'app';

describe('useResetRepositoryMutation', () => {
  it('Calls updateServiceConfig with correct arguments and payload', async () => {
    const result = renderHookWithMockStore()(() => useResetRepositoryMutation(org, app))
      .renderHookResult.result;

    await result.current.mutateAsync();

    expect(queriesMock.resetRepoChanges).toHaveBeenCalledTimes(1);
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledWith(org, app);
  });
});
