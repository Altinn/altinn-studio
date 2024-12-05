import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useResetRepositoryMutation } from './useResetRepositoryMutation';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

describe('useResetRepositoryMutation', () => {
  it('Calls resetRepoChanges', async () => {
    const { result } = renderUseResetRepositoryMutation();
    await result.current.mutateAsync();
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledTimes(1);
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledWith(org, app);
  });
});

function renderUseResetRepositoryMutation() {
  return renderHookWithProviders(() => useResetRepositoryMutation(org, app));
}
