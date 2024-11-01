import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { User } from 'app-shared/types/Repository';
import { QueryKey } from 'app-shared/types/QueryKey';
import { toast } from 'react-toastify';

export const useUserQuery = (): UseQueryResult<User> => {
  const { getUser } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CurrentUser],
    queryFn: () =>
      getUser().catch((error) => {
        toast.error('useUserQuery --- ', error);

        return error;
      }),
  });
};
