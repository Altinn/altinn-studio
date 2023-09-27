import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to edit an existing app config.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 */
export const useAppConfigMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { updateAppConfig } = useServicesContext();

  return useMutation({
    mutationFn: (payload: AppConfig) => updateAppConfig(org, app, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppConfig, org, app] });
    },
  });
};
