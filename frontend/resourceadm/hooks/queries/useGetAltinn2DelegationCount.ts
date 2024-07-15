import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetAltinn2DelegationsCount = (
  org: string,
  serviceCode: string,
  serviceEdition: string,
  env: string,
): UseQueryResult<number> => {
  const { getAltinn2DelegationsCount } = useServicesContext();
  return useQuery<number>({
    queryKey: [QueryKey.Altinn2DelegationCount, org, serviceCode, serviceEdition, env],
    queryFn: () => getAltinn2DelegationsCount(org, serviceCode, serviceEdition, env),
    enabled: !!org && !!serviceCode && !!serviceEdition && !!env,
  });
};
