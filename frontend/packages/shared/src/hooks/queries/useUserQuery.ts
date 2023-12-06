import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { User } from 'app-shared/types/User';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUserQuery = (): UseQueryResult<User> => {
  const { getUser } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CurrentUser],
    queryFn: getUser,
  });
};
