import { useQueryKey } from 'src/features/routing/AppRoutingContext';

/**
 * Hook checking whether we are in PDF generation mode
 */
export function useIsPdf() {
  return useQueryKey('pdf') === '1';
}
