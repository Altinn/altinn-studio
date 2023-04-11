import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/servicesContext';
import { User } from '../../services/userService';

enum ServerStateCacheKey {
  GetCurrentUser = 'GET_CURRENT_USER',
}

export const useUserQuery = (): UseQueryResult<User> => {
  const { userService } = useServicesContext();
  return useQuery<User>([ServerStateCacheKey.GetCurrentUser], () => userService.getCurrentUser());
};
