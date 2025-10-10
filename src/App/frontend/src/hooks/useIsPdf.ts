import { SearchParams } from 'src/core/routing/types';
import { useQueryKey } from 'src/hooks/navigation';

/**
 * Hook checking whether we are in PDF generation mode
 */
export function useIsPdf() {
  return useQueryKey(SearchParams.Pdf) === '1';
}
