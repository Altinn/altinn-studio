import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../common/ServiceContext';
import { User } from 'app-shared/types/User';

enum ServerStateCacheKey {
  GetCurrentUser = 'GET_CURRENT_USER',
}

export const useUserQuery = (): UseQueryResult<User> => {
  const { getUser } = useServicesContext();
  return useQuery<User>([ServerStateCacheKey.GetCurrentUser], () => getUser());
};
