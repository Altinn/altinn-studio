import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { EnvId } from '../../utils/resourceUtils';

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/**
 * Query to get the environments the organization can publish resources to. The environments are
 * decided by the backend and returned in the order they should be presented to the user.
 *
 * @param org the organization of the user
 *
 * @returns UseQueryResult with a list of environment ids
 */
export const useGetResourceEnvironmentsQuery = (org: string): UseQueryResult<EnvId[]> => {
  const { getResourceEnvironments } = useServicesContext();

  return useQuery<EnvId[]>({
    queryKey: [QueryKey.ResourceEnvironments, org],
    queryFn: () => getResourceEnvironments(org) as Promise<EnvId[]>,
    staleTime: ONE_HOUR_IN_MILLISECONDS,
  });
};
