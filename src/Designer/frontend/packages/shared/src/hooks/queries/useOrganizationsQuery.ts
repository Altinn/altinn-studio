import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { Organization } from 'app-shared/types/Organization';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useOrganizationsQuery = (): UseQueryResult<Organization[]> => {
  const { getOrganizations } = useServicesContext();
  return useQuery<Organization[]>({
    queryKey: [QueryKey.Organizations],
    queryFn: () => getOrganizations(),
  });
};
