import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertPerson } from 'app-shared/types/OrgAlertContactPoint';

export const useGetOrgAlertPersonsQuery = (org: string): UseQueryResult<OrgAlertPerson[]> => {
  const { getOrgAlertPersons } = useServicesContext();
  return useQuery<OrgAlertPerson[]>({
    queryKey: [QueryKey.OrgAlertPersons, org],
    queryFn: () => getOrgAlertPersons(org),
  });
};
