import { useQuery } from '@tanstack/react-query';
import type { HttpError } from 'app-shared/utils/networking';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { type MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export const useGetSelectedScopesQuery = (enabled: boolean = true) => {
  const { org, app } = useStudioEnvironmentParams();
  const { getSelectedMaskinportenScopes } = useServicesContext();
  return useQuery<MaskinportenScopes, HttpError>({
    queryKey: [QueryKey.SelectedAppScopes, org, app],
    queryFn: () => getSelectedMaskinportenScopes(org, app),
    enabled,
    meta: {
      hideDefaultError: (error: HttpError) => error?.response?.status === ServerCodes.Forbidden,
    },
  });
};
