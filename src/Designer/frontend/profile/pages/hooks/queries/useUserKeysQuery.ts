import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUserKeysQuery = (): UseQueryResult<string[]> => {
  const { getUserKeys } = useServicesContext();

  return useQuery({
    queryKey: [QueryKey.UserKeys],
    queryFn: () => getUserKeys(),
  });
};
