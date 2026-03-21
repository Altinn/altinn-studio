import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetOrgAlertPersonsQuery = (org: string) => {
  const { getOrgAlertPersons } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.OrgAlertPersons, org],
    queryFn: () => getOrgAlertPersons(org),
  });
};
