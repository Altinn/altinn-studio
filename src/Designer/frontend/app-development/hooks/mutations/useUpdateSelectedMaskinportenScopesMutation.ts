import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { type MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateSelectedMaskinportenScopesMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();
  const { updateSelectedMaskinportenScopes } = useServicesContext();

  return useMutation({
    mutationFn: (payload: MaskinportenScopes) =>
      updateSelectedMaskinportenScopes(org, app, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.SelectedAppScopes, org, app] }),
  });
};
