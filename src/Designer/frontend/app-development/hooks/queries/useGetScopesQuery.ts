import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useGetScopesQuery = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { getMaskinportenScopes } = useServicesContext();
  return useQuery<MaskinportenScopes>({
    queryKey: [QueryKey.AppScopes],
    queryFn: () => getMaskinportenScopes(org, app),
  });
};
