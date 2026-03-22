import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetOrgAlertContactPointsQuery = (org: string) => {
  const { getOrgAlertContactPoints } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.OrgAlertContactPoints, org],
    queryFn: () => getOrgAlertContactPoints(org),
  });
};
