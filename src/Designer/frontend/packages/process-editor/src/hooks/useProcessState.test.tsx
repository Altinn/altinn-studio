import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { org, app } from '@studio/testing/testids';
import { useRefreshProcessDependencies } from './useProcessState';

describe('useRefreshProcessDependencies', () => {
  it('waits for dependency refetches without invalidating process snapshots', async () => {
    const queryClient = createQueryClientMock();
    let finishRefresh: () => void;
    const refreshing = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(refreshing);
    const { result } = renderProcessDependencies(queryClient);
    const onComplete = jest.fn();
    const refresh = result.current().then(onComplete);

    for (const key of [
      QueryKey.AppMetadata,
      QueryKey.AppMetadataModelIds,
      QueryKey.AppPolicy,
      QueryKey.LayoutSets,
      QueryKey.LayoutSetsExtended,
      QueryKey.SubformComponents,
      QueryKey.FormLayouts,
      QueryKey.FormLayoutSettings,
      QueryKey.Pages,
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key, org, app] });
    }
    expect(invalidate).toHaveBeenCalledTimes(9);
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      finishRefresh();
      await refresh;
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('finishes all refetches when one dependency fails', async () => {
    const queryClient = createQueryClientMock();
    const getLayoutSettings = jest.fn().mockRejectedValue(new Error('Cannot load the settings'));
    let finishLayoutSets: (layoutSets: unknown[]) => void;
    const getLayoutSets = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(new Promise((resolve) => (finishLayoutSets = resolve)));
    const unsubscribe = [
      observe(queryClient, QueryKey.FormLayoutSettings, getLayoutSettings),
      observe(queryClient, QueryKey.LayoutSets, getLayoutSets),
    ];
    await waitFor(() => expect(getLayoutSets).toHaveBeenCalledTimes(1));
    const { result } = renderProcessDependencies(queryClient);
    const onComplete = jest.fn();

    const refresh = result.current().then(onComplete);
    await waitFor(() => expect(getLayoutSettings).toHaveBeenCalledTimes(2));
    expect(getLayoutSets).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      finishLayoutSets([]);
      await refresh;
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    unsubscribe.forEach((stop) => stop());
  });
});

function observe(
  queryClient: ReturnType<typeof createQueryClientMock>,
  key: QueryKey,
  queryFn: () => Promise<unknown>,
): () => void {
  return new QueryObserver(queryClient, { queryKey: [key, org, app], queryFn }).subscribe(() => {});
}

function renderProcessDependencies(queryClient: ReturnType<typeof createQueryClientMock>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRefreshProcessDependencies(org, app), { wrapper });
}
