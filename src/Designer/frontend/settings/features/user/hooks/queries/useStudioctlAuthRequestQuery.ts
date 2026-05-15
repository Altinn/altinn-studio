import { useQuery } from '@tanstack/react-query';
import type { QueryMeta } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useStudioctlAuthRequestQuery = (
  id: string | null,
  enabled: boolean,
  meta?: QueryMeta,
) => {
  const { getStudioctlAuthRequest } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.StudioctlAuthRequest, id],
    queryFn: () => getStudioctlAuthRequest(id!),
    enabled: Boolean(id) && enabled,
    meta,
  });
};
