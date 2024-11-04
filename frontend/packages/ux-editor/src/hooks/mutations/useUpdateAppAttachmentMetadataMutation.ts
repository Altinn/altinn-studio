import { useMutation } from '@tanstack/react-query';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useUpdateAppAttachmentMetadataMutation = (org: string, app: string) => {
  const { updateAppAttachmentMetadata } = useServicesContext();
  return useMutation({
    mutationFn: async (metadata: ApplicationAttachmentMetadata) => {
      await updateAppAttachmentMetadata(org, app, metadata);
      return metadata;
    },
  });
};
