import { useQuery } from '@tanstack/react-query';
import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUserKeysQuery = (meta?: QueryMeta): UseQueryResult<string[]> => {
  const { getUserKeys } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.UserKeys],
    queryFn: () => getUserKeys(),
    meta,
  });
};
