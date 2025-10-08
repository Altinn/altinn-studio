import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';

const __default__ = '';

/**
 * Fetches the post place for a given zip code.
 * This hook was designed primarily for use in the Address component.
 * It therefore behaves a bit differently than the other queries,
 * in that it does not simply return the raw useQuery.
 */
export const usePostPlaceQuery = (zipCode: string | undefined, enabled: boolean) => {
  const { fetchPostPlace } = useAppQueries();
  const _enabled = enabled && Boolean(zipCode?.length) && zipCode !== __default__ && zipCode !== '0';
  const { data, isFetching, error } = useQuery({
    enabled: _enabled,
    queryKey: ['fetchPostPlace', zipCode],
    queryFn: () => fetchPostPlace(zipCode!),
  });

  useEffect(() => {
    error && window.logError(`Fetching post place for zip code ${zipCode} failed:\n`, error);
  }, [error, zipCode]);

  if (isFetching) {
    return null;
  }

  if (_enabled && data?.valid) {
    return data.result;
  }
  return __default__;
};
