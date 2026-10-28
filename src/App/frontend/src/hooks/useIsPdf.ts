import { SearchParams } from 'src/core/routing/types';
import { useQueryKey } from 'src/hooks/navigation';

/**
 * Hook checking whether we are in PDF generation mode
 */
export function useIsPdf() {
  return useQueryKey(SearchParams.Pdf) === '1';
}

/**
 * Checks whether a route request renders in PDF generation mode, for route loaders that run outside React.
 */
export function isPdfRequest(request: Request) {
  return new URL(request.url).searchParams.get(SearchParams.Pdf) === '1';
}
