import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/QueryProvider';
export function useLogoSvg() {
  const { fetchLogo } = useAppQueries();
  const { data, error } = useQuery({
    queryKey: ['logoSvg'],
    queryFn: fetchLogo,
  });
  return { data, error };
}
