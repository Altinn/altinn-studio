import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useIsFetchingQueries } from 'src/core/queries/useIsFetchingData';

function setup(filters?: Parameters<typeof useIsFetchingQueries>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useIsFetchingQueries(filters), { wrapper });
  return { queryClient, hook };
}

describe('useIsFetchingQueries', () => {
  it('is true while a matching query fetches', async () => {
    const { queryClient, hook } = setup({ queryKey: ['watched'] });
    const watched = Promise.withResolvers<string>();
    const other = Promise.withResolvers<string>();

    act(() => {
      void queryClient.fetchQuery({ queryKey: ['other'], queryFn: () => other.promise });
    });
    expect(hook.result.current).toBe(false);

    act(() => {
      void queryClient.fetchQuery({ queryKey: ['watched', 1], queryFn: () => watched.promise });
    });
    await waitFor(() => expect(hook.result.current).toBe(true));

    await act(async () => watched.resolve('done'));
    await waitFor(() => expect(hook.result.current).toBe(false));
    other.resolve('done');
  });

  it('does not re-check the cache when observers subscribe to a query that is not fetching', async () => {
    const { queryClient, hook } = setup();
    await act(() => queryClient.fetchQuery({ queryKey: ['cached'], queryFn: () => 'value', staleTime: Infinity }));
    const isFetching = vi.spyOn(queryClient, 'isFetching');

    const unsubscribers: (() => void)[] = [];
    await act(async () => {
      for (let i = 0; i < 50; i++) {
        const observer = new QueryObserver(queryClient, { queryKey: ['cached'], staleTime: Infinity });
        unsubscribers.push(observer.subscribe(() => {}));
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(hook.result.current).toBe(false);
    // React itself checks the snapshot a few times, but not once per observer event
    expect(isFetching.mock.calls.length).toBeLessThan(10);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  });
});
