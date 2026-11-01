import { useMutation } from '@tanstack/react-query';

export type FetchMoreResults = {
  /** True while the next page is being fetched, so the button can disable itself. */
  isFetchingMoreResults: boolean;
  doFetchMoreResults: () => void;
};

/**
 * Drives a "load more" button from an infinite query's `fetchNextPage`.
 *
 * `fetchNextPage` resolves with the query result rather than rejecting, so this pending flag only
 * says that a fetch is in flight; whether it succeeded is the query's `isFetchNextPageError`.
 */
export const useFetchMoreResults = (fetchMoreResults: () => Promise<unknown>): FetchMoreResults => {
  const { isPending, mutate } = useMutation({ mutationFn: fetchMoreResults });
  return { isFetchingMoreResults: isPending, doFetchMoreResults: () => mutate() };
};
