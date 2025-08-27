import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { User } from 'app-shared/types/Repository';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUserQuery = (): UseQueryResult<User> => {
  const { getUser } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CurrentUser],
    queryFn: getUser,
  });
};
