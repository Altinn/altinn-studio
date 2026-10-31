import { describe, expect, it, vi } from 'vitest';
import { useMutation } from '@tanstack/react-query';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { useRefreshRepoStatusAfterChanges } from './useRefreshRepoStatusAfterChanges';

describe('useRefreshRepoStatusAfterChanges', () => {
  it('should refresh the repository status when a change is saved', async () => {
    const { result, invalidateQueries } = renderSave(() => Promise.resolve());

    await result.current.mutateAsync();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [QueryKey.RepoStatus, org, app] });
  });

  it('should not refresh the repository status when a change fails', async () => {
    const { result, invalidateQueries } = renderSave(() => Promise.reject(new Error('Not saved')));

    await expect(result.current.mutateAsync()).rejects.toThrow('Not saved');

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

const renderSave = (save: () => Promise<void>) => {
  const queryClient = createQueryClientMock();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHookWithProviders(
    () => {
      useRefreshRepoStatusAfterChanges(org, app);
      return useMutation({ mutationFn: save, meta: { hideDefaultError: true } });
    },
    { queryClient },
  );
  return { result, invalidateQueries };
};
