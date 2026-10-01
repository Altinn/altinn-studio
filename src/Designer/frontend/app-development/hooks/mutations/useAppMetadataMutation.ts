import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to edit metadata in an app.
 *
 * @param org the organization of the user
 * @param app the app the user is in
 */
export const useAppMetadataMutation = (org: string, app: string, meta?: MutationMeta) => {
  const queryClient = useQueryClient();
  const { updateAppMetadata } = useServicesContext();

  return useMutation({
    mutationFn: (payload: ApplicationMetadata) => updateAppMetadata(org, app, payload),
    onSuccess: (metadata) => {
      // Cache the saved revision for the next edit.
      if (metadata?.revision) {
        queryClient.setQueryData([QueryKey.AppMetadata, org, app], metadata);
      } else {
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppValidation, org, app] });
    },
    onError: (_error, metadata) => {
      // Refresh metadata that may have changed elsewhere.
      if (metadata.revision) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
      }
    },
    meta,
  });
};
