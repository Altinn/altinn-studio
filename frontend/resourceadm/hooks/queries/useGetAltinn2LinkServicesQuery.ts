import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

/**
 * Query to get the list of services from Altinn 2.
 *
 * @param org the organisation of the user
 * @param environment the environment to import from
 *
 * @returns UseQueryResult with a list of resources of Resource
 */
export const useGetAltinn2LinkServicesQuery = (
  org: string,
  environment: string,
): UseQueryResult<Altinn2LinkService[], AxiosError> => {
  const { getAltinn2LinkServices } = useServicesContext();

  return useQuery<Altinn2LinkService[], AxiosError>({
    queryKey: [QueryKey.Altinn2Services, org, environment],
    queryFn: () => getAltinn2LinkServices(org, environment),
  });
};
