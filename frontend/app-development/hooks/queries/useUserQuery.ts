import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../common/ServiceContext';
import { User } from 'app-shared/types/User';
import { QueryKey } from '../../types/QueryKey';

export const useUserQuery = (): UseQueryResult<User> => {
  const { getUser } = useServicesContext();
  return useQuery<User>([QueryKey.CurrentUser], () => getUser());
};
