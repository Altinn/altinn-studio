import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useResetRepositoryMutation } from './useResetRepositoryMutation';
import { app, org } from '@studio/testing/testids';

describe('useResetRepositoryMutation', () => {
  it('Calls updateServiceConfig with correct arguments and payload', async () => {
    const result = renderHookWithProviders(() => useResetRepositoryMutation(org, app)).result;

    await result.current.mutateAsync();

    expect(queriesMock.resetRepoChanges).toHaveBeenCalledTimes(1);
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledWith(org, app);
  });
});
