import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import { REPO_STATUS_STALE_TIME_MS, useRepoStatusQuery } from './useRepoStatusQuery';

const repoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok',
};

describe('useRepoStatusQuery', () => {
  it('Reuses a status that has just loaded when another component asks for it', async () => {
    const getRepoStatus = vi.fn().mockResolvedValue(repoStatus);
    const queryClient = createQueryClientWithAppDefaults();

    const { result: firstResult } = renderUseRepoStatusQuery(getRepoStatus, queryClient);
    await waitFor(() => expect(firstResult.current.isSuccess).toBe(true));
    const { result: secondResult } = renderUseRepoStatusQuery(getRepoStatus, queryClient);

    expect(secondResult.current.data).toEqual(repoStatus);
    expect(secondResult.current.isFetching).toBe(false);
    expect(getRepoStatus).toHaveBeenCalledTimes(1);
  });

  it('Fetches the status again when a component asks for it after it went stale', async () => {
    const getRepoStatus = vi.fn().mockResolvedValue(repoStatus);
    const queryClient = createQueryClientWithAppDefaults();
    queryClient.setQueryData([QueryKey.RepoStatus, org, app], repoStatus, {
      updatedAt: Date.now() - REPO_STATUS_STALE_TIME_MS - 1,
    });

    renderUseRepoStatusQuery(getRepoStatus, queryClient);

    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(1));
    expect(getRepoStatus).toHaveBeenCalledWith(org, app);
  });
});

// The shared query client mock never treats data as stale, which would hide the refetch the app's client makes.
const createQueryClientWithAppDefaults = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

const renderUseRepoStatusQuery = (
  getRepoStatus: (owner: string, app: string) => Promise<RepoStatus>,
  queryClient: QueryClient,
) =>
  renderHookWithProviders(() => useRepoStatusQuery(org, app), {
    queries: { getRepoStatus },
    queryClient,
  });
