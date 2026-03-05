import { useQuery } from '@tanstack/react-query';
import type { QueryMeta } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUserPersonalAccessTokensQuery = (meta?: QueryMeta) => {
  const { getUserPersonalAccessTokens } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.UserPersonalAccessTokens],
    queryFn: () => getUserPersonalAccessTokens(),
    meta,
  });
};
