import { useSearchParams } from 'react-router-dom';

/**
 * Hook checking whether we are in PDF generation mode
 */
export function useIsPdf() {
  const [searchParams] = useSearchParams();
  return searchParams.get('pdf') === '1';
}
