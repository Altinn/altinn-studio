import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUpdateAppAttachmentMetadataMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { updateAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: async (metadata: ApplicationAttachmentMetadata) => {
      await updateAppAttachmentMetadata(org, app, metadata);
      return metadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] });
    },
  });
};
