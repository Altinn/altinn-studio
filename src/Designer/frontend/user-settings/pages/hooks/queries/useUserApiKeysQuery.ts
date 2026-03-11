import { useQuery } from '@tanstack/react-query';
import type { QueryMeta } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUserApiKeysQuery = (meta?: QueryMeta) => {
  const { getUserApiKeys } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.UserApiKeys],
    queryFn: () => getUserApiKeys(),
    meta,
  });
};
