import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetContactPointsQuery = (org: string) => {
  const { getContactPoints } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.ContactPoints, org],
    queryFn: () => getContactPoints(org),
  });
};
