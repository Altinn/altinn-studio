import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/servicesContext';
import { Organization } from '../../services/organizationService';

enum ServerStateCacheKey {
  GetOrganizations = 'GET_ORGANIZATIONS',
}

export const useOrganizationsQuery = (): UseQueryResult<Organization[]> => {
  const { organizationService } = useServicesContext();
  return useQuery<Organization[]>([ServerStateCacheKey.GetOrganizations], () =>
    organizationService.getOrganizations()
  );
};
