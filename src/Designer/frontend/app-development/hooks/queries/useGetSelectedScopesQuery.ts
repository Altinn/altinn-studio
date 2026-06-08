import { useQuery } from '@tanstack/react-query';
import type { QueryMeta } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useGetSelectedScopesQuery = (enabled: boolean = true, meta?: QueryMeta) => {
  const { org, app } = useStudioEnvironmentParams();
  const { getSelectedMaskinportenScopes } = useServicesContext();
  return useQuery<MaskinportenScopes>({
    queryKey: [QueryKey.SelectedAppScopes, org, app],
    queryFn: () => getSelectedMaskinportenScopes(org, app),
    enabled,
    meta,
  });
};
