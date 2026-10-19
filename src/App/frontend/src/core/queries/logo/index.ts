import { useQuery } from '@tanstack/react-query';

import { useResourcesApi } from 'src/core/contexts/ApiProvider';

export function useLogoSvg() {
  const { fetchLogo } = useResourcesApi();
  const { data, error } = useQuery({
    queryKey: ['logoSvg'],
    queryFn: fetchLogo,
  });
  return { data, error };
}
