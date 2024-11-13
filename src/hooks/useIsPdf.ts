import { SearchParams, useQueryKey } from 'src/features/routing/AppRoutingContext';

/**
 * Hook checking whether we are in PDF generation mode
 */
export function useIsPdf() {
  return useQueryKey(SearchParams.Pdf) === '1';
}
