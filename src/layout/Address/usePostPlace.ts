import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import type { PostalCodesRegistry } from 'src/types/shared';

const __default__ = '';

function lookupPostPlace(data: PostalCodesRegistry, zip: string): string {
  const index = parseInt(zip, 10);
  if (isNaN(index) || index < 0 || index >= data.mapping.length) {
    return '';
  }
  const placeIndex = data.mapping[index];
  if (placeIndex === 0) {
    return '';
  }
  return data.places[placeIndex] ?? '';
}

/**
 * Looks up the post place for a given zip code by fetching postal code data.
 * This hook was designed primarily for use in the Address component.
 */
export function usePostPlace(zipCode: string | undefined, enabled: boolean) {
  const { fetchPostalCodes } = useAppQueries();
  const _enabled = enabled && Boolean(zipCode?.length) && zipCode !== __default__ && zipCode !== '0';

  const { data } = useQuery({
    queryKey: ['postalCodes'],
    queryFn: fetchPostalCodes,
    staleTime: Infinity,
    enabled: _enabled,
  });

  if (!_enabled || !data) {
    return __default__;
  }

  return lookupPostPlace(data, zipCode!);
}
