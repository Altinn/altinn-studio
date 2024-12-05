import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useIsLoggedInWithAnsattportenQuery = () => {
  const { getIsLoggedInWithAnsattporten } = useServicesContext();
  return useQuery<{ isLoggedIn: boolean }>({
    queryKey: [QueryKey.IsLoggedInWithAnsattporten],
    queryFn: getIsLoggedInWithAnsattporten,
  });
};
