import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to edit metadata in an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 */
export const useAppMetadataMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { updateAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: (payload: ApplicationMetadata) => updateAppMetadata(org, app, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
    },
  });
};
